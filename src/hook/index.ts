import { defineHook } from '@directus/extensions-sdk';
import schema from '../../schema.json';

export default defineHook(({ action }, { services, logger, database, getSchema }) => {
	logger.info('[inFrame Extension] 🔧 Hook registrado e inicializado!');

	action('server.start', async () => {
		logger.info('[inFrame Extension] 🚀 Evento server.start disparado!');

		try {
			await setupCollections({ services, logger, database, getSchema });
		} catch (error: any) {
			logger.error(`[inFrame Extension] ❌ Erro durante setup inicial: ${error.message}`);
			logger.error(error.stack);
		}
	});

	action('extensions.install', async ({ extension }: any) => {
		if (extension?.includes('inframe') || extension?.includes('@devix-tecnologia/directus-extension-inframe')) {
			logger.info('[inFrame Extension] Extensão instalada, configurando coleções...');

			try {
				await setupCollections({ services, logger, database, getSchema });
			} catch (error: any) {
				logger.error(`[inFrame Extension] Erro durante instalação: ${error.message}`);
			}
		}
	});

	action('extensions.reload', async () => {
		logger.info('[inFrame Extension] Verificando configuração das coleções...');

		try {
			await verifyCollections({ logger, database });
		} catch (error: any) {
			logger.warn(`[inFrame Extension] Erro ao verificar coleções: ${error.message}`);
		}
	});
});

async function verifyCollections({ logger, database }: any) {
	const existingCollections = await database
		.select('collection')
		.from('directus_collections')
		.whereIn('collection', schema.collections.map((c: any) => c.collection));

	const existingCount = existingCollections.length;
	const totalCount = schema.collections.length;

	if (existingCount === totalCount) {
		logger.info(`[inFrame Extension] Todas as ${totalCount} coleções estão configuradas corretamente ✓`);
	} else {
		logger.warn(`[inFrame Extension] ${existingCount}/${totalCount} coleções encontradas.`);
	}
}

async function setupCollections({ services, logger, database, getSchema }: any) {
	logger.info('[inFrame Extension] 📋 Função setupCollections chamada');

	const { CollectionsService, FieldsService, RelationsService } = services;

	logger.info('[inFrame Extension] Iniciando configuração de coleções...');

	try {
		const currentSchema = await getSchema();

		const existingCollections = await database
			.select('collection')
			.from('directus_collections')
			.whereIn('collection', schema.collections.map((c: any) => c.collection));

		const existingCollectionNames = new Set(existingCollections.map((c: any) => c.collection));

		logger.info(
			`[inFrame Extension] 📊 Coleções encontradas: ${Array.from(existingCollectionNames).join(', ') || 'nenhuma'}`,
		);

		if (existingCollectionNames.size === schema.collections.length) {
			logger.info('[inFrame Extension] ✅ Todas as coleções já existem.');
			return;
		}

		// Serviços com permissões de admin
		const collectionsService = new CollectionsService({
			knex: database,
			schema: currentSchema,
			accountability: null,
		});

		const fieldsService = new FieldsService({
			knex: database,
			schema: currentSchema,
			accountability: null,
		});

		const relationsService = new RelationsService({
			knex: database,
			schema: currentSchema,
			accountability: null,
		});

		const created = { collections: 0, fields: 0, relations: 0 };

		// 1. Criar coleções (ordem: pasta primeiro, depois outras)
		const ordered = ['inframe_pasta', 'languages', 'inframe', 'inframe_translations'];

		for (const name of ordered) {
			const col = schema.collections.find((c: any) => c.collection === name);

			if (!col || existingCollectionNames.has(name)) continue;

			try {
				logger.info(`[inFrame Extension] 🔨 Criando: ${name}`);
				await collectionsService.createOne({ collection: col.collection, meta: col.meta });
				created.collections++;
				logger.info(`[inFrame Extension] ✅ ${name} criada`);
			} catch (error: any) {
				logger.error(`[inFrame Extension] ❌ Erro em ${name}: ${error.message}`);
			}
		}

		// Aguardar e recarregar schema múltiplas vezes para garantir atualização
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// 2. Atualizar schema e criar campos
		const newSchema = await getSchema();

		logger.info(`[inFrame Extension] 📋 Schema atualizado, coleções disponíveis: ${Object.keys(newSchema.collections).filter((k) => !k.startsWith('directus')).join(', ')}`);

		const updatedFieldsService = new FieldsService({
			knex: database,
			schema: newSchema,
			accountability: null,
		});

		for (const field of schema.fields.filter((f: any) => !existingCollectionNames.has(f.collection))) {
			// Verificar se a coleção existe no schema antes de criar o campo
			if (!newSchema.collections[field.collection]) {
				logger.warn(
					`[inFrame Extension] ⚠ Coleção ${field.collection} não encontrada no schema, pulando campo ${field.field}`,
				);
				continue;
			}

			try {
				await updatedFieldsService.createField(field.collection, field);
				created.fields++;
				logger.info(`[inFrame Extension] ✅ Campo ${field.collection}.${field.field} criado`);
			} catch (error: any) {
				logger.warn(`[inFrame Extension] ⚠ Campo ${field.collection}.${field.field}: ${error.message}`);
			}
		}

		// Aguardar e recarregar schema para relações
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// 3. Criar relações
		const finalSchema = await getSchema();

		logger.info(`[inFrame Extension] 📋 Preparando criação de relações...`);

		const updatedRelationsService = new RelationsService({
			knex: database,
			schema: finalSchema,
			accountability: null,
		});

		for (const rel of schema.relations || []) {
			const exists = finalSchema.relations.some(
				(r: any) =>
					r.collection === rel.collection &&
					r.field === rel.field &&
					r.related_collection === rel.related_collection,
			);

			if (exists) continue;

			// Verificar se as coleções da relação existem
			if (!finalSchema.collections[rel.collection]) {
				logger.warn(
					`[inFrame Extension] ⚠ Coleção ${rel.collection} não encontrada, pulando relação`,
				);
				continue;
			}

			if (rel.related_collection && !finalSchema.collections[rel.related_collection]) {
				logger.warn(
					`[inFrame Extension] ⚠ Coleção relacionada ${rel.related_collection} não encontrada, pulando relação`,
				);
				continue;
			}

			try {
				await updatedRelationsService.createOne(rel);
				created.relations++;
				logger.info(`[inFrame Extension] ✅ Relação ${rel.collection}.${rel.field} criada`);
			} catch (error: any) {
				logger.warn(`[inFrame Extension] ⚠ Relação ${rel.collection}.${rel.field}: ${error.message}`);
			}
		}

		logger.info(
			`[inFrame Extension] ✅ Concluído! ${created.collections} coleções, ${created.fields} campos, ${created.relations} relações`,
		);
	} catch (error: any) {
		logger.error(`[inFrame Extension] ❌ Erro: ${error.message}`);
		logger.error(error.stack);
		throw error;
	}
}
