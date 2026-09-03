import type { INodeProperties } from 'n8n-workflow';

export const documentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['document'],
			},
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel a submitted document (sets docstatus to 2)',
				action: 'Cancel a document',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a document',
				action: 'Create a document',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a document',
				action: 'Delete a document',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a document',
				action: 'Get a document',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many documents',
				action: 'Get many documents',
			},
			{
				name: 'Submit',
				value: 'submit',
				description: 'Submit a draft document (sets docstatus to 1)',
				action: 'Submit a document',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a document',
				action: 'Update a document',
			},
		],
		default: 'create',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['customMethod'],
			},
		},
		options: [
			{
				name: 'Execute',
				value: 'execute',
				description: 'Execute a whitelisted Frappe method',
				action: 'Execute a custom method',
			},
		],
		default: 'execute',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		options: [
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file attachment to ERPNext',
				action: 'Upload a file',
			},
		],
		default: 'upload',
	},
];

export const documentFields: INodeProperties[] = [
	// ----------------------------------
	//       document: getAll
	// ----------------------------------
	{
		displayName: 'DocType Name or ID',
		name: 'docType',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		default: '',
		description:
			'DocType whose documents to retrieve. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		placeholder: 'Customer',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['getAll'],
			},
		},
		required: true,
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 10,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Field Names or IDs',
				name: 'fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getDocFilters',
					loadOptionsDependsOn: ['docType'],
				},
				default: [],
				description:
					'Fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				placeholder: 'name,country',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'string',
				default: '',
				placeholder: 'creation desc',
				description: 'Sort results by field, e.g. "creation desc" or "modified asc"',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Filter',
				description: 'Structured filters',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Filter',
						name: 'customProperty',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
								typeOptions: {
									loadOptionsMethod: 'getDocFields',
									loadOptionsDependsOn: ['docType'],
								},
								default: '',
							},
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								default: 'is',
								options: [
									{
										name: 'EQUALS, or GREATER',
										value: 'equalsGreater',
									},
									{
										name: 'EQUALS, or LESS',
										value: 'equalsLess',
									},
									{
										name: 'In',
										value: 'in',
									},
									{
										name: 'IS',
										value: 'is',
									},
									{
										name: 'IS GREATER',
										value: 'greater',
									},
									{
										name: 'IS LESS',
										value: 'less',
									},
									{
										name: 'IS NOT',
										value: 'isNot',
									},
									{
										name: 'Like',
										value: 'like',
									},
									{
										name: 'Not In',
										value: 'notIn',
									},
									{
										name: 'Not Like',
										value: 'notLike',
									},
								],
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the operator condition',
							},
						],
					},
				],
			},
			{
				displayName: 'Raw JSON Filters',
				name: 'filtersJson',
				type: 'string',
				default: '',
				placeholder: '[["status", "=", "Open"], ["docstatus", "=", 1]]',
				description: 'Pass Frappe filters as a JSON array of filters or key-value object',
			},
		],
	},

	// ----------------------------------
	//       document: create
	// ----------------------------------
	{
		displayName: 'DocType Name or ID',
		name: 'docType',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		required: true,
		description:
			'DocType you would like to create. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		placeholder: 'Customer',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		options: [
			{
				name: 'Define Below (Key-Value)',
				value: 'properties',
			},
			{
				name: 'JSON / Expression (Supports Child Tables)',
				value: 'json',
			},
		],
		default: 'properties',
		description: 'Whether to provide document properties via fields or as a raw JSON object/expression',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Properties',
		name: 'properties',
		type: 'fixedCollection',
		placeholder: 'Add Property',
		required: true,
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['create'],
				dataMode: ['properties'],
			},
		},
		options: [
			{
				displayName: 'Property',
				name: 'customProperty',
				placeholder: 'Add Property',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'field',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getDocFields',
							loadOptionsDependsOn: ['docType'],
						},
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Document JSON',
		name: 'documentJson',
		type: 'string',
		default: '',
		placeholder: '{\n  "customer_name": "Acme Corp",\n  "customer_group": "Commercial"\n}',
		description: 'Raw JSON object or expression representing document data',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['create'],
				dataMode: ['json'],
			},
		},
		required: true,
	},

	// ----------------------------------
	//          document: get
	// ----------------------------------
	{
		displayName: 'DocType Name or ID',
		name: 'docType',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		default: '',
		description:
			'The type of document you would like to get. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['get'],
			},
		},
		required: true,
	},
	{
		displayName: 'Document Name',
		name: 'documentName',
		type: 'string',
		default: '',
		description: 'The name (ID) of document you would like to get',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['get'],
			},
		},
		required: true,
	},

	// ----------------------------------
	//       document: delete
	// ----------------------------------
	{
		displayName: 'DocType Name or ID',
		name: 'docType',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		default: '',
		description:
			'The type of document you would like to delete. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['delete'],
			},
		},
		required: true,
	},
	{
		displayName: 'Document Name',
		name: 'documentName',
		type: 'string',
		default: '',
		description: 'The name (ID) of document you would like to delete',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['delete'],
			},
		},
		required: true,
	},

	// ----------------------------------
	//       document: update
	// ----------------------------------
	{
		displayName: 'DocType Name or ID',
		name: 'docType',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		default: '',
		description:
			'The type of document you would like to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['update'],
			},
		},
		required: true,
	},
	{
		displayName: 'Document Name',
		name: 'documentName',
		type: 'string',
		default: '',
		description: 'The name (ID) of document you would like to update',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['update'],
			},
		},
		required: true,
	},
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		options: [
			{
				name: 'Define Below (Key-Value)',
				value: 'properties',
			},
			{
				name: 'JSON / Expression (Supports Child Tables)',
				value: 'json',
			},
		],
		default: 'properties',
		description: 'Whether to provide document properties via fields or as a raw JSON object/expression',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Properties',
		name: 'properties',
		type: 'fixedCollection',
		placeholder: 'Add Property',
		description: 'Properties of request body',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['update'],
				dataMode: ['properties'],
			},
		},
		options: [
			{
				displayName: 'Property',
				name: 'customProperty',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'field',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getDocFields',
							loadOptionsDependsOn: ['docType'],
						},
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Document JSON',
		name: 'documentJson',
		type: 'string',
		default: '',
		placeholder: '{\n  "customer_name": "Updated Acme Corp"\n}',
		description: 'Raw JSON object or expression representing updated fields',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['update'],
				dataMode: ['json'],
			},
		},
		required: true,
	},

	// ----------------------------------
	//       document: submit
	// ----------------------------------
	{
		displayName: 'DocType Name or ID',
		name: 'docType',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		default: '',
		description:
			'The type of document to submit. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['submit'],
			},
		},
		required: true,
	},
	{
		displayName: 'Document Name',
		name: 'documentName',
		type: 'string',
		default: '',
		description: 'The name (ID) of document to submit',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['submit'],
			},
		},
		required: true,
	},

	// ----------------------------------
	//       document: cancel
	// ----------------------------------
	{
		displayName: 'DocType Name or ID',
		name: 'docType',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		default: '',
		description:
			'The type of document to cancel. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['cancel'],
			},
		},
		required: true,
	},
	{
		displayName: 'Document Name',
		name: 'documentName',
		type: 'string',
		default: '',
		description: 'The name (ID) of document to cancel',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['cancel'],
			},
		},
		required: true,
	},

	// ----------------------------------
	//     customMethod: execute
	// ----------------------------------
	{
		displayName: 'Method Name',
		name: 'methodName',
		type: 'string',
		default: '',
		placeholder: 'frappe.client.get_value',
		description: 'The whitelisted Python dotted method path (e.g. frappe.client.get_value or erpnext.stock.utils.get_stock_balance)',
		displayOptions: {
			show: {
				resource: ['customMethod'],
				operation: ['execute'],
			},
		},
		required: true,
	},
	{
		displayName: 'HTTP Method',
		name: 'httpMethod',
		type: 'options',
		options: [
			{
				name: 'POST',
				value: 'POST',
			},
			{
				name: 'GET',
				value: 'GET',
			},
		],
		default: 'POST',
		description: 'HTTP method used to call the whitelisted method',
		displayOptions: {
			show: {
				resource: ['customMethod'],
				operation: ['execute'],
			},
		},
	},
	{
		displayName: 'Parameters Mode',
		name: 'parameterMode',
		type: 'options',
		options: [
			{
				name: 'Define Below (Key-Value)',
				value: 'properties',
			},
			{
				name: 'JSON / Expression',
				value: 'json',
			},
		],
		default: 'properties',
		displayOptions: {
			show: {
				resource: ['customMethod'],
				operation: ['execute'],
			},
		},
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'fixedCollection',
		placeholder: 'Add Parameter',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['customMethod'],
				operation: ['execute'],
				parameterMode: ['properties'],
			},
		},
		options: [
			{
				displayName: 'Parameter',
				name: 'customProperty',
				values: [
					{
						displayName: 'Name',
						name: 'field',
						type: 'string',
						default: '',
						description: 'Name of the method argument',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the method argument',
					},
				],
			},
		],
	},
	{
		displayName: 'Parameters JSON',
		name: 'parametersJson',
		type: 'string',
		default: '',
		placeholder: '{\n  "doctype": "Item",\n  "filters": {"item_code": "ITEM-001"},\n  "fieldname": "item_name"\n}',
		description: 'Arguments to pass to the method in JSON format',
		displayOptions: {
			show: {
				resource: ['customMethod'],
				operation: ['execute'],
				parameterMode: ['json'],
			},
		},
	},

	// ----------------------------------
	//           file: upload
	// ----------------------------------
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		description: 'Name of the binary property that contains the file to upload',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
	},
	{
		displayName: 'Attach to Document',
		name: 'attachToDocument',
		type: 'boolean',
		default: false,
		description: 'Whether to attach the uploaded file to a specific ERPNext document',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
	},
	{
		displayName: 'DocType Name or ID',
		name: 'docType',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDocTypes',
		},
		default: '',
		description: 'DocType to attach the file to',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
				attachToDocument: [true],
			},
		},
		required: true,
	},
	{
		displayName: 'Document Name',
		name: 'documentName',
		type: 'string',
		default: '',
		description: 'Name (ID) of the document to attach the file to',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
				attachToDocument: [true],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional Options',
		name: 'fileOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
		options: [
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'custom-name.pdf',
				description: 'Override the uploaded file name',
			},
			{
				displayName: 'Folder',
				name: 'folder',
				type: 'string',
				default: 'Home',
				description: 'Folder in ERPNext file manager to save into',
			},
			{
				displayName: 'Is Private',
				name: 'isPrivate',
				type: 'boolean',
				default: true,
				description: 'Whether the file requires authentication to view/download',
			},
		],
	},
];
