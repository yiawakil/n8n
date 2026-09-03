import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Return the base API URL based on the user's environment.
 */
export const getBaseUrl = ({ environment, domain, subdomain }: ERPNextApiCredentials): string => {
	let baseUrl = '';
	if (environment === 'cloudHosted') {
		baseUrl = `https://${subdomain}.${domain}`;
	} else {
		baseUrl = (domain || '').trim();
		if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
			baseUrl = `https://${baseUrl}`;
		}
	}
	return baseUrl.replace(/\/+$/, '');
};

export async function erpNextApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject | string | Buffer = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const credentials = await this.getCredentials<ERPNextApiCredentials>('erpNextApi');
	const baseUrl = getBaseUrl(credentials);
	const targetUri = uri || `${baseUrl}${resource.startsWith('/') ? resource : `/${resource}`}`;

	let options: IRequestOptions = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs: query,
		uri: targetUri,
		json: true,
		rejectUnauthorized: !credentials.allowUnauthorizedCerts,
	};

	options = Object.assign({}, options, option);

	if (options.body && typeof options.body === 'object' && !Buffer.isBuffer(options.body)) {
		if (Object.keys(options.body as IDataObject).length === 0) {
			delete options.body;
		}
	}

	if (options.qs && Object.keys(options.qs as IDataObject).length === 0) {
		delete options.qs;
	}

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'erpNextApi', options);
	} catch (error) {
		// Extract Frappe-specific error messages if present
		if (error.response?.data) {
			const data = error.response.data;
			let customMessage = '';

			if (typeof data === 'object') {
				if (data._server_messages) {
					try {
						const serverMessages = JSON.parse(data._server_messages);
						if (Array.isArray(serverMessages)) {
							const extracted = serverMessages.map((msgStr: string) => {
								try {
									const parsed = JSON.parse(msgStr);
									return parsed.message || msgStr;
								} catch {
									return msgStr;
								}
							});
							customMessage = extracted.join('; ');
						}
					} catch {
						// Ignore parse failure
					}
				}

				if (!customMessage && data.exception) {
					customMessage = data.exception;
				}

				if (!customMessage && data.message && typeof data.message === 'string') {
					customMessage = data.message;
				}
			}

			if (customMessage) {
				throw new NodeApiError(this.getNode(), error, {
					message: customMessage,
				});
			}
		}

		if (error.statusCode === 403) {
			throw new NodeApiError(this.getNode(), error, { message: 'DocType or resource unavailable or permission denied.' });
		}

		if (error.statusCode === 307) {
			throw new NodeApiError(this.getNode(), error, {
				message: 'Please ensure the subdomain or domain URL is correct.',
			});
		}

		throw error;
	}
}

export async function erpNextApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject,
	query: IDataObject = {},
) {
	const returnData: any[] = [];

	let responseData;
	query.limit_start = 0;
	query.limit_page_length = 1000;

	do {
		responseData = await erpNextApiRequest.call(this, method, resource, body, query);
		const items = (responseData[propertyName] || []) as IDataObject[];
		returnData.push(...items);
		query.limit_start = (query.limit_start as number) + (query.limit_page_length as number);
	} while (responseData[propertyName] && (responseData[propertyName] as any[]).length >= (query.limit_page_length as number));

	return returnData;
}

export type ERPNextApiCredentials = {
	apiKey: string;
	apiSecret: string;
	environment: 'cloudHosted' | 'selfHosted';
	subdomain?: string;
	domain?: string;
	allowUnauthorizedCerts?: boolean;
};
