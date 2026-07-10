import type { NuvemShopOperationDefinition, NuvemShopResourceDefinition } from '../types';

import { jsonBody, jsonQuery, pathParameter } from './common';

const blogId = pathParameter('blogId', 'Blog ID', 'blog', {
	placeholder: 'e.g. 019a0baf-d644-755c-aa03-843c92af7047',
	description:
		'UUID of the store blog returned by Blog > Get Blog. A store exposes its blog identifier through GET /blogs; never substitute the store ID, a post ID, or a guessed UUID.',
});

const blogPostId = pathParameter('postId', 'Blog Post ID', 'blog post', {
	placeholder: 'e.g. 019a0c14-73f4-7a8d-a862-5c275f5e65ac',
	description:
		'UUID of a post belonging to the selected blog. Obtain it from Blog > Create Post, Get Many Posts, or Get Post. It must belong to blogId and must never be inferred from a title or handle.',
});

const emailTemplateId = pathParameter('templateId', 'Email Template ID', 'email template', {
	placeholder: 'e.g. 80946',
	description:
		'Numeric ID of a store email template returned by Email Template > Get Many. Do not use the template type string, such as orderconfirmation, in place of this ID.',
});

const pageId = pathParameter('pageId', 'Page ID', 'page', {
	placeholder: 'e.g. 105034',
	description:
		'Numeric custom-page ID returned by Page > Create, Get, or Get Many. Never derive it from a localized title, handle, URL, blog post, or metafield owner ID.',
});

const scriptId = pathParameter('scriptId', 'Script ID', 'script', {
	placeholder: 'e.g. 12345',
	description:
		'Numeric ID of a script registered for this app in the Nuvemshop Partner Portal and returned by Script > Get or Get Many. It is not a script version ID, store ID, or application ID.',
});

const blogOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create Post',
		value: 'createPost',
		action: 'Create a multilingual blog post',
		description:
			'Create one post in the exact store blog. This writes content and can publish it immediately. metadata must include a non-empty language plus title, summary, SEO title, SEO description, and handle. The endpoint requires multipart/form-data: the node serializes the metadata object as a JSON string and converts {$binary:"propertyName"} markers into files. Validate HTML and SEO fields, and leave published false when editorial approval is still required.',
		method: 'POST',
		path: '/blogs/{blogId}/posts',
		pathParameters: [blogId],
		apiVersion: '2025-03',
		bodyType: 'multipart',
		body: jsonBody(
			'Multipart post fields represented as JSON. metadata is serialized into the required JSON-string form; content and published are optional. thumbnail accepts only an existing image URL. To use incoming binary data, call Upload Thumbnail first and pass its returned thumbnail_url here.',
			'{"metadata":{"language":"pt","title":"Como escolher o produto ideal","summary":"Guia pratico para comparar opcoes.","seo_title":"Como escolher o produto ideal","seo_description":"Compare recursos e escolha o melhor produto.","handle":"como-escolher-produto"},"content":"<p>Conteudo completo do artigo.</p>","published":false,"thumbnail":"https://cdn.example.com/blog/como-escolher-produto.jpg"}',
		),
	},
	{
		name: 'Delete Post',
		value: 'deletePost',
		action: 'Permanently delete a blog post',
		description:
			'Permanently delete one blog post and its associated data. This destructive action cannot be undone and can break storefront, campaign, search, and external links. Retrieve the post first, verify both UUIDs, and require explicit human approval when an AI agent can call this operation.',
		method: 'DELETE',
		path: '/blogs/{blogId}/posts/{postId}',
		pathParameters: [blogId, blogPostId],
		apiVersion: '2025-03',
	},
	{
		name: 'Get Blog',
		value: 'getBlog',
		action: 'Get the store blog identifier',
		description:
			'Retrieve the blog associated with the connected store. The response contains blog_id and owner information. Use the returned blog_id for every post, publication, media, and thumbnail operation; this request is read-only and does not return the post collection.',
		method: 'GET',
		path: '/blogs',
		apiVersion: '2025-03',
	},
	{
		name: 'Get Many Posts',
		value: 'getManyPosts',
		action: 'Get many posts from a blog',
		description:
			'List posts belonging to one exact blog, including UUIDs, translations, rich HTML, SEO metadata, publication timestamps, thumbnail, and author data. Return All follows the page metadata until no next page remains; otherwise Limit caps the records returned as separate n8n items. Use returned post IDs for subsequent writes.',
		method: 'GET',
		path: '/blogs/{blogId}/posts',
		pathParameters: [blogId],
		apiVersion: '2025-03',
		paginated: true,
		responseProperty: 'posts.data',
		query: jsonQuery(
			'The stable endpoint documents only page-based pagination. The node manages page automatically for Return All and Limit, so do not provide page here.',
		),
	},
	{
		name: 'Get Post',
		value: 'getPost',
		action: 'Get a blog post',
		description:
			'Retrieve one blog post by its blog and post UUIDs. The response includes every available language entry, HTML content, handle, summary, SEO metadata, author, thumbnail, and publication timestamps. Use this read operation before update, publish, unpublish, or delete so existing translations and content can be preserved deliberately.',
		method: 'GET',
		path: '/blogs/{blogId}/posts/{postId}',
		pathParameters: [blogId, blogPostId],
		apiVersion: '2025-03',
	},
	{
		name: 'Publish Post',
		value: 'publishPost',
		action: 'Publish a blog post on the storefront',
		description:
			'Publish one existing draft post and make it visible to customers. This changes public storefront content and returns HTTP 204 with no body. Retrieve and review all languages, HTML, SEO metadata, and thumbnail first; use human approval for AI-generated content.',
		method: 'PATCH',
		path: '/blogs/{blogId}/posts/{postId}/publish',
		pathParameters: [blogId, blogPostId],
		apiVersion: '2025-03',
	},
	{
		name: 'Unpublish Post',
		value: 'unpublishPost',
		action: 'Unpublish a blog post from the storefront',
		description:
			'Hide one published post from customers while retaining it as a draft. This changes public availability and may affect campaign or search links; it returns HTTP 204 with no body. Confirm both UUIDs and the current publication state before calling it.',
		method: 'PATCH',
		path: '/blogs/{blogId}/posts/{postId}/unpublish',
		pathParameters: [blogId, blogPostId],
		apiVersion: '2025-03',
	},
	{
		name: 'Update Post',
		value: 'updatePost',
		action: 'Update a multilingual blog post',
		description:
			'Update one post by exact blog and post UUIDs. The endpoint requires multipart/form-data and a metadata JSON string with a non-empty language; the node accepts metadata as an object and serializes it. This can replace visible HTML, SEO data, handle, thumbnail, and publication state. Retrieve the current post first and preserve every translation or field that must remain.',
		method: 'PUT',
		path: '/blogs/{blogId}/posts/{postId}',
		pathParameters: [blogId, blogPostId],
		apiVersion: '2025-03',
		bodyType: 'multipart',
		body: jsonBody(
			'Multipart fields for the updated post. metadata is serialized as a JSON string. content and published are optional; thumbnail accepts only a URL string. Upload binary cover data through Upload Thumbnail and then pass the returned thumbnail_url here.',
			'{"metadata":{"language":"pt","title":"Como escolher o produto certo","summary":"Guia atualizado para comparar opcoes.","seo_title":"Como escolher o produto certo","seo_description":"Guia atualizado de comparacao.","handle":"como-escolher-produto-certo"},"content":"<p>Conteudo revisado do artigo.</p>","published":true,"thumbnail":"https://cdn.example.com/blog/como-escolher-produto-certo.jpg"}',
		),
	},
	{
		name: 'Upload Media',
		value: 'uploadMedia',
		action: 'Upload a blog content image and return its URL',
		description:
			'Upload one image for use inside blog-post HTML. The multipart field must be named media and the {$binary:"propertyName"} marker must reference an existing n8n binary input. The response only returns media_url; it does not attach the image to a post. Insert that URL into the content HTML in a later Create Post or Update Post call.',
		method: 'POST',
		path: '/blogs/{blogId}/posts/media',
		pathParameters: [blogId],
		apiVersion: '2025-03',
		bodyType: 'multipart',
		body: jsonBody(
			'Multipart media upload represented as JSON. media must be a binary marker naming the n8n binary property that contains the image file.',
			'{"media":{"$binary":"data"}}',
		),
	},
	{
		name: 'Upload Thumbnail',
		value: 'uploadThumbnail',
		action: 'Upload a blog cover image and return its URL',
		description:
			'Upload one main or cover image for a blog post. The multipart field must be named image and reference an existing n8n binary property. The response only returns thumbnail_url and does not attach it automatically. Immediately pass that URL as thumbnail in Update Post for the intended post.',
		method: 'POST',
		path: '/blogs/{blogId}/posts/thumbnail',
		pathParameters: [blogId],
		apiVersion: '2025-03',
		bodyType: 'multipart',
		body: jsonBody(
			'Multipart thumbnail upload represented as JSON. image must be a binary marker naming the n8n binary property that contains the cover image.',
			'{"image":{"$binary":"data"}}',
		),
	},
];

const emailTemplateOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Get',
		value: 'get',
		action: 'Get an email template',
		description:
			'Retrieve one automated store email template by numeric ID. The response includes its immutable type, HTML-enabled state, and localized subject, plain-text, and HTML bodies. Use this before Update so every language and format that must remain can be preserved.',
		method: 'GET',
		path: '/email-templates/{templateId}',
		pathParameters: [emailTemplateId],
		apiVersion: '2025-03',
	},
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get all email templates',
		description:
			'Retrieve every automated email template available in the connected store, including order confirmation, shipping, cancellation, account, password, and abandoned-checkout templates. This endpoint explicitly does not support pagination and returns the complete array in one request. Use the numeric IDs for Get and Update.',
		method: 'GET',
		path: '/email-templates',
		apiVersion: '2025-03',
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update a localized email template',
		description:
			'Update the subject and plain-text or HTML content of one automated customer email. This changes messages sent by the store. Localized objects use language codes such as pt, es, and en. Retrieve the template first, preserve all required languages, keep a usable plain-text alternative, and validate placeholders and HTML before writing. The template type itself is not changed.',
		method: 'PUT',
		path: '/email-templates/{templateId}',
		pathParameters: [emailTemplateId],
		apiVersion: '2025-03',
		body: jsonBody(
			'Writable email-template fields. html_enabled controls whether HTML is used; subject, template_html, and template_text are objects keyed by store language code.',
			'{"html_enabled":true,"subject":{"pt":"Seu pedido foi confirmado","es":"Tu orden fue confirmada"},"template_html":{"pt":"<p>Obrigado pela compra. Seu pedido foi confirmado.</p>","es":"<p>Gracias por tu compra. Tu orden fue confirmada.</p>"},"template_text":{"pt":"Obrigado pela compra. Seu pedido foi confirmado.","es":"Gracias por tu compra. Tu orden fue confirmada."}}',
		),
	},
];

const pageOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create',
		value: 'create',
		action: 'Create a multilingual storefront page',
		description:
			'Create one custom storefront page with localized title, HTML, handle, SEO title, and SEO description. The body must use the page.publish and page.i18n envelope, and each i18n key is a locale such as pt_BR, es_AR, or en_US. This creates public storefront content; the current API treats pages as published and visible, so review content and handles before creation.',
		method: 'POST',
		path: '/pages',
		apiVersion: '2025-03',
		body: jsonBody(
			'Page creation envelope. page.i18n maps locale codes to title, content, seo_handle, seo_title, and seo_description.',
			'{"page":{"publish":true,"i18n":{"pt_BR":{"title":"Sobre nos","content":"<p>Nossa empresa foi fundada em 2020.</p>","seo_handle":"sobre-nos","seo_title":"Sobre nossa empresa","seo_description":"Conheca nossa historia e missao."},"es_AR":{"title":"Sobre nosotros","content":"<p>Nuestra empresa fue fundada en 2020.</p>","seo_handle":"sobre-nosotros","seo_title":"Sobre nuestra empresa","seo_description":"Conoce nuestra historia y mision."}}}}',
		),
	},
	{
		name: 'Delete',
		value: 'delete',
		action: 'Permanently delete a storefront page',
		description:
			'Permanently delete one custom page by numeric ID. This destructive action removes visible storefront content and can break menus, campaigns, SEO results, metafields, and external links. Retrieve and confirm the page and every localized handle first; require human approval when exposed to an AI agent.',
		method: 'DELETE',
		path: '/pages/{pageId}',
		pathParameters: [pageId],
		apiVersion: '2025-03',
	},
	{
		name: 'Get',
		value: 'get',
		action: 'Get a storefront page',
		description:
			'Retrieve one custom page by exact numeric ID, including localized name, handle, HTML content, SEO fields, publication state, and timestamps. This read-only operation is the safest prerequisite for updates or deletion because it exposes every translation that may need preservation.',
		method: 'GET',
		path: '/pages/{pageId}',
		pathParameters: [pageId],
		apiVersion: '2025-03',
	},
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get many storefront pages',
		description:
			'List custom pages in the connected store, including numeric IDs, publication state, timestamps, and all localized content and SEO fields. Return All follows the pages envelope until its last page; otherwise Limit caps results returned as separate n8n items. Use returned IDs for Get, Update, Delete, and page metafields.',
		method: 'GET',
		path: '/pages',
		apiVersion: '2025-03',
		paginated: true,
		responseProperty: 'pages.results',
		query: jsonQuery(
			'Optional page-list query values supported by the API, excluding page and per_page because Return All and Limit manage pagination.',
		),
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update storefront page content',
		description:
			'Update the documented title and content fields of one custom page by numeric ID. This changes visible storefront content immediately. Unlike Create, the current PUT contract uses a flat body rather than the page.publish and page.i18n envelope. Retrieve the page first, preserve content that must remain, and do not send read-only IDs or timestamps.',
		method: 'PUT',
		path: '/pages/{pageId}',
		pathParameters: [pageId],
		apiVersion: '2025-03',
		body: jsonBody(
			'Documented flat page update fields. title is the new page title and content is the complete replacement HTML/text content.',
			'{"title":"Sobre nossa equipe","content":"<p>Conheca nossa equipe e nossa historia atualizada.</p>"}',
		),
	},
];

const scriptOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create',
		value: 'create',
		action: 'Associate a non-auto-installed script with the store',
		description:
			'Create the store association required to load one script that was registered as non-auto-installable in the Partner Portal. This endpoint does not register JavaScript or create a script version. script_id must be the Partner Portal script ID and query_params must be a JSON-encoded string that becomes URL query parameters. Call it for every installation, even when the parameter object is empty.',
		method: 'POST',
		path: '/scripts',
		body: jsonBody(
			'Script-store association. query_params is a string containing valid JSON, not a nested object; use "{}" when the script has no parameters.',
			'{"script_id":12345,"query_params":"{\\"showDialog\\":true,\\"source\\":\\"n8n\\"}"}',
		),
	},
	{
		name: 'Delete',
		value: 'delete',
		action: 'Remove a script association from the store',
		description:
			'Remove the association between one non-auto-installed script and the connected store, causing that script to stop loading for this store. This does not delete its Partner Portal definition or versions. Confirm the exact script ID and require human review because storefront functionality can stop immediately.',
		method: 'DELETE',
		path: '/scripts/{scriptId}',
		pathParameters: [scriptId],
	},
	{
		name: 'Get',
		value: 'get',
		action: 'Get a store script',
		description:
			'Retrieve one script by exact numeric ID for the connected store. The response includes name, event, location, auto-install flag, status, current store parameters, and current or draft version metadata. This operation reads configuration; it does not download or execute the JavaScript source.',
		method: 'GET',
		path: '/scripts/{scriptId}',
		pathParameters: [scriptId],
	},
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get many store scripts',
		description:
			'List scripts visible to the connected store, including association parameters, auto-install state, deployment status, and current or draft version URLs. Return All follows API pages; otherwise Limit caps the scripts returned as separate n8n items. Use the returned script IDs for Get, association updates, and removal.',
		method: 'GET',
		path: '/scripts',
		paginated: true,
		responseProperty: 'result',
		query: jsonQuery(
			'The endpoint documents only page and per_page. The node manages both for Return All and Limit, so no additional query values are normally needed.',
		),
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update a script association for the store',
		description:
			'Change the URL query parameters associated with one non-auto-installed script in the connected store. This does not modify JavaScript code, versions, deployment status, event, or location. The path and body script IDs must refer to the same script, and query_params must be a JSON-encoded string. Validate parameters because changes affect live storefront behavior.',
		method: 'PUT',
		path: '/scripts/{scriptId}',
		pathParameters: [scriptId],
		body: jsonBody(
			'Updated script-store association. Repeat the exact script_id and encode query_params as a JSON string; use "{}" to remove all custom parameters without removing the association.',
			'{"script_id":12345,"query_params":"{\\"showDialog\\":false,\\"source\\":\\"campaign\\"}"}',
		),
	},
];

export const contentResources: NuvemShopResourceDefinition[] = [
	{
		name: 'Blog',
		value: 'blog',
		description:
			'Create and manage multilingual blog posts, publication state, SEO metadata, rich HTML, content images, and cover images. Blog and post identifiers are UUIDs. Upload operations return URLs that must be applied to a post in a separate write.',
		operations: blogOperations,
	},
	{
		name: 'Email Template',
		value: 'emailTemplate',
		description:
			'Read and update localized automated customer emails. Templates have fixed types and numeric IDs, support plain-text and HTML bodies, and can affect order, shipping, account, password, and abandoned-checkout communications.',
		operations: emailTemplateOperations,
	},
	{
		name: 'Page',
		value: 'page',
		description:
			'Create, list, retrieve, update, and delete multilingual custom storefront pages with localized HTML, handles, titles, and SEO metadata. Page writes change public content and use numeric IDs plus a page.i18n locale envelope.',
		operations: pageOperations,
	},
	{
		name: 'Script',
		value: 'script',
		description:
			'Read scripts and manage per-store associations for scripts registered as non-auto-installable in the Partner Portal. Public API writes configure loading and query parameters; they do not create JavaScript definitions or deploy script versions.',
		operations: scriptOperations,
	},
];
