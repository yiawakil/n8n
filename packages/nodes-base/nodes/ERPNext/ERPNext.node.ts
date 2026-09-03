/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { documentFields, documentOperations } from './DocumentDescription';
import { erpNextApiRequest, erpNextApiRequestAllItems } from './GenericFunctions';
import type { DocumentProperties } from './utils';
import { processNames, toSQL } from './utils';

export class ERPNext implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ERPNext',
		name: 'erpNext',
		icon: 'file:erpnext.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Consume ERPNext and Frappe API',
		defaults: {
			name: 'ERPNext',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'erpNextApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Document',
						value: 'document',
					},
					{
						name: 'Custom Method',
						value: 'customMethod',
					},
					{
						name: 'File',
						value: 'file',
					},
				],
				default: 'document',
			},
			...documentOperations,
			...documentFields,
		],
	};

	methods = {
		loadOptions: {
			async getDocTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const data = await erpNextApiRequestAllItems.call(
						this,
						'data',
						'GET',
						'/api/resource/DocType',
						{},
					);
					const docTypes = data.map(({ name }: { name: string }) => {
						return { name, value: name };
					});

					return processNames(docTypes);
				} catch {
					return [];
				}
			},
			async getDocFilters(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const docFields = (await (this.methods.loadOptions.getDocFields.call(
					this,
				) as Promise<INodePropertyOptions[]>)) || [];
				const cloned = [...docFields];
				cloned.unshift({ name: '*', value: '*' });
				return cloned;
			},
			async getDocFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const docType = this.getCurrentNodeParameter('docType') as string;
				if (!docType) {
					return [];
				}

				// Try Frappe's desk form endpoint first (accessible without full System Manager role)
				try {
					const response = await erpNextApiRequest.call(
						this,
						'GET',
						`/api/method/frappe.desk.form.load.getdoctype?doctype=${encodeURIComponent(docType)}`,
						{},
					);
					const docs = response?.docs || response?.message?.docs;
					if (Array.isArray(docs) && docs[0]?.fields) {
						const docFields = docs[0].fields
							.filter((f: { fieldname?: string; label?: string }) => f.fieldname && f.label)
							.map(({ label, fieldname }: { label: string; fieldname: string }) => ({
								name: label,
								value: fieldname,
							}));
						return processNames(docFields);
					}
				} catch {
					// Fallback to /api/resource/DocType/{docType}
				}

				try {
					const { data } = await erpNextApiRequest.call(
						this,
						'GET',
						`/api/resource/DocType/${encodeURIComponent(docType)}`,
						{},
					);

					if (data?.fields && Array.isArray(data.fields)) {
						const docFields = data.fields
							.filter((f: { fieldname?: string; label?: string }) => f.fieldname && f.label)
							.map(({ label, fieldname }: { label: string; fieldname: string }) => ({
								name: label,
								value: fieldname,
							}));

						return processNames(docFields);
					}
				} catch {
					// Return empty if schema cannot be fetched
				}

				return [];
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			let responseData: any;
			const body: IDataObject = {};
			const qs: IDataObject = {};

			try {
				if (resource === 'document') {
					if (operation === 'get') {
						const docType = this.getNodeParameter('docType', i) as string;
						const documentName = this.getNodeParameter('documentName', i) as string;

						responseData = await erpNextApiRequest.call(
							this,
							'GET',
							`/api/resource/${encodeURIComponent(docType)}/${encodeURIComponent(documentName)}`,
						);
						responseData = responseData.data;
					} else if (operation === 'getAll') {
						const docType = this.getNodeParameter('docType', i) as string;
						const endpoint = `/api/resource/${encodeURIComponent(docType)}`;

						const options = (this.getNodeParameter('options', i, {}) as {
							fields?: string[];
							orderBy?: string;
							filters?: {
								customProperty?: Array<{ field: string; operator: string; value: string }>;
							};
							filtersJson?: string;
						}) || {};

						if (options.fields && options.fields.length > 0) {
							if (options.fields.includes('*')) {
								qs.fields = JSON.stringify(['*']);
							} else {
								qs.fields = JSON.stringify(options.fields);
							}
						}

						if (options.orderBy) {
							qs.order_by = options.orderBy;
						}

						if (options.filtersJson) {
							try {
								const parsed = JSON.parse(options.filtersJson);
								qs.filters = JSON.stringify(parsed);
							} catch {
								throw new NodeOperationError(
									this.getNode(),
									'Raw JSON Filters must be a valid JSON array or object.',
									{ itemIndex: i },
								);
							}
						} else if (options.filters?.customProperty && options.filters.customProperty.length > 0) {
							qs.filters = JSON.stringify(
								options.filters.customProperty.map((filter) => {
									return [docType, filter.field, toSQL(filter.operator), filter.value];
								}),
							);
						}

						const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i, 10) as number;
							qs.limit_page_length = limit;
							qs.limit_start = 0;
							responseData = await erpNextApiRequest.call(this, 'GET', endpoint, {}, qs);
							responseData = responseData.data;
						} else {
							responseData = await erpNextApiRequestAllItems.call(
								this,
								'data',
								'GET',
								endpoint,
								{},
								qs,
							);
						}
					} else if (operation === 'create') {
						const docType = this.getNodeParameter('docType', i) as string;
						const dataMode = this.getNodeParameter('dataMode', i, 'properties') as string;

						let payload: IDataObject = {};

						if (dataMode === 'json') {
							const documentJson = this.getNodeParameter('documentJson', i) as string;
							try {
								payload = typeof documentJson === 'object' ? documentJson : JSON.parse(documentJson);
							} catch {
								throw new NodeOperationError(
									this.getNode(),
									'Document JSON must be a valid JSON object.',
									{ itemIndex: i },
								);
							}
						} else {
							const properties = this.getNodeParameter('properties', i, {}) as DocumentProperties;
							if (!properties?.customProperty || properties.customProperty.length === 0) {
								throw new NodeOperationError(
									this.getNode(),
									'Please enter at least one property for the document to create, or select JSON mode.',
									{ itemIndex: i },
								);
							}
							properties.customProperty.forEach((property) => {
								payload[property.field] = property.value;
							});
						}

						responseData = await erpNextApiRequest.call(
							this,
							'POST',
							`/api/resource/${encodeURIComponent(docType)}`,
							payload,
						);
						responseData = responseData.data;
					} else if (operation === 'update') {
						const docType = this.getNodeParameter('docType', i) as string;
						const documentName = this.getNodeParameter('documentName', i) as string;
						const dataMode = this.getNodeParameter('dataMode', i, 'properties') as string;

						let payload: IDataObject = {};

						if (dataMode === 'json') {
							const documentJson = this.getNodeParameter('documentJson', i) as string;
							try {
								payload = typeof documentJson === 'object' ? documentJson : JSON.parse(documentJson);
							} catch {
								throw new NodeOperationError(
									this.getNode(),
									'Document JSON must be a valid JSON object.',
									{ itemIndex: i },
								);
							}
						} else {
							const properties = this.getNodeParameter('properties', i, {}) as DocumentProperties;
							if (!properties?.customProperty || properties.customProperty.length === 0) {
								throw new NodeOperationError(
									this.getNode(),
									'Please enter at least one property for the document to update, or select JSON mode.',
									{ itemIndex: i },
								);
							}
							properties.customProperty.forEach((property) => {
								payload[property.field] = property.value;
							});
						}

						responseData = await erpNextApiRequest.call(
							this,
							'PUT',
							`/api/resource/${encodeURIComponent(docType)}/${encodeURIComponent(documentName)}`,
							payload,
						);
						responseData = responseData.data;
					} else if (operation === 'delete') {
						const docType = this.getNodeParameter('docType', i) as string;
						const documentName = this.getNodeParameter('documentName', i) as string;

						await erpNextApiRequest.call(
							this,
							'DELETE',
							`/api/resource/${encodeURIComponent(docType)}/${encodeURIComponent(documentName)}`,
						);
						responseData = { success: true, message: `Document '${documentName}' deleted successfully.` };
					} else if (operation === 'submit') {
						const docType = this.getNodeParameter('docType', i) as string;
						const documentName = this.getNodeParameter('documentName', i) as string;

						responseData = await erpNextApiRequest.call(
							this,
							'PUT',
							`/api/resource/${encodeURIComponent(docType)}/${encodeURIComponent(documentName)}`,
							{ docstatus: 1 },
						);
						responseData = responseData.data;
					} else if (operation === 'cancel') {
						const docType = this.getNodeParameter('docType', i) as string;
						const documentName = this.getNodeParameter('documentName', i) as string;

						responseData = await erpNextApiRequest.call(
							this,
							'PUT',
							`/api/resource/${encodeURIComponent(docType)}/${encodeURIComponent(documentName)}`,
							{ docstatus: 2 },
						);
						responseData = responseData.data;
					}
				} else if (resource === 'customMethod') {
					if (operation === 'execute') {
						const methodName = (this.getNodeParameter('methodName', i) as string).trim();
						const httpMethod = this.getNodeParameter('httpMethod', i, 'POST') as 'GET' | 'POST';
						const parameterMode = this.getNodeParameter('parameterMode', i, 'properties') as string;

						let methodParams: IDataObject = {};

						if (parameterMode === 'json') {
							const parametersJson = this.getNodeParameter('parametersJson', i, '') as string;
							if (parametersJson) {
								try {
									methodParams = typeof parametersJson === 'object' ? parametersJson : JSON.parse(parametersJson);
								} catch {
									throw new NodeOperationError(
										this.getNode(),
										'Parameters JSON must be a valid JSON object.',
										{ itemIndex: i },
									);
								}
							}
						} else {
							const params = this.getNodeParameter('parameters', i, {}) as {
								customProperty?: Array<{ field: string; value: string }>;
							};
							if (params?.customProperty) {
								params.customProperty.forEach((prop) => {
									methodParams[prop.field] = prop.value;
								});
							}
						}

						const endpoint = `/api/method/${methodName}`;
						if (httpMethod === 'GET') {
							responseData = await erpNextApiRequest.call(this, 'GET', endpoint, {}, methodParams);
						} else {
							responseData = await erpNextApiRequest.call(this, 'POST', endpoint, methodParams);
						}

						if (responseData && responseData.message !== undefined) {
							if (
								typeof responseData.message === 'object' &&
								responseData.message !== null &&
								!Array.isArray(responseData.message)
							) {
								responseData = responseData.message;
							} else {
								responseData = { result: responseData.message };
							}
						}
					}
				} else if (resource === 'file') {
					if (operation === 'upload') {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data') as string;
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						const fileBufferData = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

						const attachToDocument = this.getNodeParameter('attachToDocument', i, false) as boolean;
						const fileOptions = this.getNodeParameter('fileOptions', i, {}) as {
							fileName?: string;
							folder?: string;
							isPrivate?: boolean;
						};

						const formData: IDataObject = {
							file: {
								value: fileBufferData,
								options: {
									contentType: binaryData.mimeType,
									filename: fileOptions.fileName || binaryData.fileName || 'file',
								},
							},
							is_private: fileOptions.isPrivate !== false ? 1 : 0,
							folder: fileOptions.folder || 'Home',
						};

						if (attachToDocument) {
							const docType = this.getNodeParameter('docType', i) as string;
							const documentName = this.getNodeParameter('documentName', i) as string;
							formData.doctype = docType;
							formData.docname = documentName;
						}

						const uploadResponse = await erpNextApiRequest.call(
							this,
							'POST',
							'/api/method/upload_file',
							{},
							{},
							undefined,
							{
								headers: {
									Accept: 'application/json',
								},
								formData,
							},
						);

						responseData = uploadResponse?.message || uploadResponse?.data || uploadResponse;
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		}

		return [returnData];
	}
}
