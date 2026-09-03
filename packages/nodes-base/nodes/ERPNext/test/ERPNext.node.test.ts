import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';
import { describe, it, expect, vi } from 'vitest';

import { ERPNext } from '../ERPNext.node';
import { erpNextApiRequest } from '../GenericFunctions';

const erpNextNode = new ERPNext();

type ParameterValue = any;

function createMockExecuteFunctions(options: {
	parameters?: Record<string, ParameterValue>;
	requestWithAuthentication?: vi.Mock;
	credentials?: IDataObject;
}) {
	const credentials = options.credentials || {
		apiKey: 'test-key',
		apiSecret: 'test-secret',
		environment: 'selfHosted',
		domain: 'https://erp.example.com',
	};

	const requestWithAuthentication =
		options.requestWithAuthentication || vi.fn().mockResolvedValue({ data: {} });

	const getCredentials = vi.fn().mockResolvedValue(credentials);
	const getBinaryDataBuffer = vi.fn().mockResolvedValue(Buffer.from('dummy file content'));
	const assertBinaryData = vi.fn().mockReturnValue({
		mimeType: 'text/plain',
		fileName: 'sample.txt',
	});

	const constructExecutionMetaData = vi.fn(
		(data: INodeExecutionData[], metadata?: { itemData?: { item: number } }) =>
			data.map((item) => ({ ...item, pairedItem: metadata?.itemData })),
	);

	const returnJsonArray = vi.fn((data: IDataObject | IDataObject[]) => {
		if (Array.isArray(data)) {
			return data.map((d) => ({ json: d }));
		}
		return [{ json: data }];
	});

	const executeFunctions = {
		continueOnFail: vi.fn(() => false),
		getCredentials,
		getInputData: vi.fn(() => [{ json: {} }]),
		getNode: vi.fn(
			() =>
				({
					id: 'erpnext-node',
					name: 'ERPNext',
					type: 'n8n-nodes-base.erpNext',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				}) as INode,
		),
		getNodeParameter: vi.fn(
			(parameterName: string, itemIndex: number, defaultValue?: ParameterValue) => {
				const params = options.parameters || {};
				if (parameterName in params) return params[parameterName];
				return defaultValue;
			},
		),
		helpers: {
			assertBinaryData,
			constructExecutionMetaData,
			getBinaryDataBuffer,
			requestWithAuthentication,
			returnJsonArray,
		},
	} as unknown as IExecuteFunctions;

	return {
		executeFunctions,
		requestWithAuthentication,
		getBinaryDataBuffer,
	};
}

describe('ERPNext Node', () => {
	it('should get a document by name', async () => {
		const requestWithAuthentication = vi.fn().mockResolvedValue({
			data: { name: 'CUST-001', customer_name: 'Acme Corp' },
		});

		const { executeFunctions } = createMockExecuteFunctions({
			parameters: {
				resource: 'document',
				operation: 'get',
				docType: 'Customer',
				documentName: 'CUST-001',
			},
			requestWithAuthentication,
		});

		const result = await (erpNextNode as INodeType).execute!.call(executeFunctions);

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'erpNextApi',
			expect.objectContaining({
				method: 'GET',
				uri: 'https://erp.example.com/api/resource/Customer/CUST-001',
			}),
		);
		expect(result[0][0].json).toEqual({ name: 'CUST-001', customer_name: 'Acme Corp' });
	});

	it('should submit a document (setting docstatus to 1)', async () => {
		const requestWithAuthentication = vi.fn().mockResolvedValue({
			data: { name: 'ACC-SINV-0001', docstatus: 1 },
		});

		const { executeFunctions } = createMockExecuteFunctions({
			parameters: {
				resource: 'document',
				operation: 'submit',
				docType: 'Sales Invoice',
				documentName: 'ACC-SINV-0001',
			},
			requestWithAuthentication,
		});

		const result = await (erpNextNode as INodeType).execute!.call(executeFunctions);

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'erpNextApi',
			expect.objectContaining({
				method: 'PUT',
				uri: 'https://erp.example.com/api/resource/Sales%20Invoice/ACC-SINV-0001',
				body: { docstatus: 1 },
			}),
		);
		expect(result[0][0].json).toEqual({ name: 'ACC-SINV-0001', docstatus: 1 });
	});

	it('should cancel a document (setting docstatus to 2)', async () => {
		const requestWithAuthentication = vi.fn().mockResolvedValue({
			data: { name: 'ACC-SINV-0001', docstatus: 2 },
		});

		const { executeFunctions } = createMockExecuteFunctions({
			parameters: {
				resource: 'document',
				operation: 'cancel',
				docType: 'Sales Invoice',
				documentName: 'ACC-SINV-0001',
			},
			requestWithAuthentication,
		});

		const result = await (erpNextNode as INodeType).execute!.call(executeFunctions);

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'erpNextApi',
			expect.objectContaining({
				method: 'PUT',
				uri: 'https://erp.example.com/api/resource/Sales%20Invoice/ACC-SINV-0001',
				body: { docstatus: 2 },
			}),
		);
		expect(result[0][0].json).toEqual({ name: 'ACC-SINV-0001', docstatus: 2 });
	});

	it('should delete a document', async () => {
		const requestWithAuthentication = vi.fn().mockResolvedValue({});

		const { executeFunctions } = createMockExecuteFunctions({
			parameters: {
				resource: 'document',
				operation: 'delete',
				docType: 'Lead',
				documentName: 'LEAD-0001',
			},
			requestWithAuthentication,
		});

		const result = await (erpNextNode as INodeType).execute!.call(executeFunctions);

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'erpNextApi',
			expect.objectContaining({
				method: 'DELETE',
				uri: 'https://erp.example.com/api/resource/Lead/LEAD-0001',
			}),
		);
		expect(result[0][0].json).toEqual(
			expect.objectContaining({ success: true, message: "Document 'LEAD-0001' deleted successfully." }),
		);
	});

	it('should create a document using JSON dataMode with nested child tables', async () => {
		const mockDoc = {
			customer: 'Acme Corp',
			items: [{ item_code: 'ITEM-1', qty: 5, rate: 100 }],
		};

		const requestWithAuthentication = vi.fn().mockResolvedValue({
			data: { name: 'SO-0001', ...mockDoc },
		});

		const { executeFunctions } = createMockExecuteFunctions({
			parameters: {
				resource: 'document',
				operation: 'create',
				docType: 'Sales Order',
				dataMode: 'json',
				documentJson: JSON.stringify(mockDoc),
			},
			requestWithAuthentication,
		});

		const result = await (erpNextNode as INodeType).execute!.call(executeFunctions);

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'erpNextApi',
			expect.objectContaining({
				method: 'POST',
				uri: 'https://erp.example.com/api/resource/Sales%20Order',
				body: mockDoc,
			}),
		);
		expect(result[0][0].json).toEqual({ name: 'SO-0001', ...mockDoc });
	});

	it('should handle empty properties gracefully with friendly error instead of crashing', async () => {
		const { executeFunctions } = createMockExecuteFunctions({
			parameters: {
				resource: 'document',
				operation: 'create',
				docType: 'Customer',
				dataMode: 'properties',
				properties: {},
			},
		});

		await expect((erpNextNode as INodeType).execute!.call(executeFunctions)).rejects.toThrow(
			'Please enter at least one property for the document to create, or select JSON mode.',
		);
	});

	it('should retrieve many documents with options, order_by, and raw JSON filters', async () => {
		const requestWithAuthentication = vi.fn().mockResolvedValue({
			data: [
				{ name: 'CUST-001', customer_name: 'Acme' },
				{ name: 'CUST-002', customer_name: 'Beta' },
			],
		});

		const { executeFunctions } = createMockExecuteFunctions({
			parameters: {
				resource: 'document',
				operation: 'getAll',
				docType: 'Customer',
				returnAll: false,
				limit: 25,
				options: {
					fields: ['name', 'customer_name'],
					orderBy: 'creation desc',
					filtersJson: '[["status", "=", "Active"]]',
				},
			},
			requestWithAuthentication,
		});

		const result = await (erpNextNode as INodeType).execute!.call(executeFunctions);

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'erpNextApi',
			expect.objectContaining({
				method: 'GET',
				uri: 'https://erp.example.com/api/resource/Customer',
				qs: {
					fields: JSON.stringify(['name', 'customer_name']),
					order_by: 'creation desc',
					filters: JSON.stringify([['status', '=', 'Active']]),
					limit_page_length: 25,
					limit_start: 0,
				},
			}),
		);
		expect(result[0].length).toBe(2);
	});

	it('should execute a whitelisted Frappe method with POST', async () => {
		const requestWithAuthentication = vi.fn().mockResolvedValue({
			message: { balance: 5000, currency: 'USD' },
		});

		const { executeFunctions } = createMockExecuteFunctions({
			parameters: {
				resource: 'customMethod',
				operation: 'execute',
				methodName: 'erpnext.accounts.utils.get_balance_on',
				httpMethod: 'POST',
				parameterMode: 'json',
				parametersJson: JSON.stringify({ account: 'Debtors - A', date: '2026-01-01' }),
			},
			requestWithAuthentication,
		});

		const result = await (erpNextNode as INodeType).execute!.call(executeFunctions);

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'erpNextApi',
			expect.objectContaining({
				method: 'POST',
				uri: 'https://erp.example.com/api/method/erpnext.accounts.utils.get_balance_on',
				body: { account: 'Debtors - A', date: '2026-01-01' },
			}),
		);
		expect(result[0][0].json).toEqual({ balance: 5000, currency: 'USD' });
	});

	it('should execute a whitelisted Frappe method with GET', async () => {
		const requestWithAuthentication = vi.fn().mockResolvedValue({
			message: 'System Online',
		});

		const { executeFunctions } = createMockExecuteFunctions({
			parameters: {
				resource: 'customMethod',
				operation: 'execute',
				methodName: 'frappe.ping',
				httpMethod: 'GET',
				parameterMode: 'properties',
			},
			requestWithAuthentication,
		});

		const result = await (erpNextNode as INodeType).execute!.call(executeFunctions);

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'erpNextApi',
			expect.objectContaining({
				method: 'GET',
				uri: 'https://erp.example.com/api/method/frappe.ping',
			}),
		);
		expect(result[0][0].json).toEqual({ result: 'System Online' });
	});

	it('should upload a file and attach it to a document', async () => {
		const requestWithAuthentication = vi.fn().mockResolvedValue({
			message: {
				name: 'FILE-0001',
				file_name: 'invoice.pdf',
				file_url: '/files/invoice.pdf',
			},
		});

		const { executeFunctions } = createMockExecuteFunctions({
			parameters: {
				resource: 'file',
				operation: 'upload',
				binaryPropertyName: 'data',
				attachToDocument: true,
				docType: 'Sales Invoice',
				documentName: 'ACC-SINV-0001',
				fileOptions: {
					fileName: 'invoice.pdf',
					isPrivate: true,
					folder: 'Home/Invoices',
				},
			},
			requestWithAuthentication,
		});

		const result = await (erpNextNode as INodeType).execute!.call(executeFunctions);

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'erpNextApi',
			expect.objectContaining({
				method: 'POST',
				uri: 'https://erp.example.com/api/method/upload_file',
			}),
		);
		expect(result[0][0].json).toEqual({
			name: 'FILE-0001',
			file_name: 'invoice.pdf',
			file_url: '/files/invoice.pdf',
		});
	});

	it('should extract Frappe _server_messages in error responses', async () => {
		const errorResponse = {
			statusCode: 417,
			response: {
				data: {
					_server_messages: JSON.stringify([
						JSON.stringify({ message: 'Customer name is mandatory.' }),
					]),
				},
			},
		};

		const requestWithAuthentication = vi.fn().mockRejectedValue(errorResponse);

		const fakeContext = {
			getNode: vi.fn(() => ({})),
			getCredentials: vi.fn().mockResolvedValue({
				apiKey: 'key',
				apiSecret: 'secret',
				environment: 'selfHosted',
				domain: 'https://erp.example.com',
			}),
			helpers: {
				requestWithAuthentication,
			},
		} as unknown as ILoadOptionsFunctions;

		await expect(
			erpNextApiRequest.call(fakeContext, 'POST', '/api/resource/Customer', {}),
		).rejects.toThrow('Customer name is mandatory.');
	});

	it('should dynamically load doc fields using frappe.desk.form.load.getdoctype', async () => {
		const requestWithAuthentication = vi.fn().mockResolvedValue({
			docs: [
				{
					fields: [
						{ fieldname: 'customer_name', label: 'Customer Name' },
						{ fieldname: 'customer_group', label: 'Customer Group' },
					],
				},
			],
		});

		const fakeContext = {
			getCurrentNodeParameter: vi.fn(() => 'Customer'),
			getNode: vi.fn(() => ({})),
			getCredentials: vi.fn().mockResolvedValue({
				apiKey: 'key',
				apiSecret: 'secret',
				environment: 'selfHosted',
				domain: 'https://erp.example.com',
			}),
			helpers: {
				requestWithAuthentication,
			},
			methods: erpNextNode.methods,
		} as unknown as ILoadOptionsFunctions;

		const fields = await erpNextNode.methods.loadOptions.getDocFields.call(fakeContext);

		expect(fields).toEqual([
			{ name: 'Customer Group', value: 'customer_group' },
			{ name: 'Customer Name', value: 'customer_name' },
		]);
	});
});
