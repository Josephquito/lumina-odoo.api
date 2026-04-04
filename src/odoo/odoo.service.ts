import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as xmlrpc from 'xmlrpc';

@Injectable()
export class OdooService implements OnModuleInit {
  private readonly logger = new Logger(OdooService.name);
  private uid: number;

  private readonly url: string;
  private readonly db: string;
  private readonly user: string;
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.url = this.config.get<string>('ODOO_URL')!;
    this.db = this.config.get<string>('ODOO_DB')!;
    this.user = this.config.get<string>('ODOO_USER')!;
    this.apiKey = this.config.get<string>('ODOO_API_KEY')!;
  }

  async onModuleInit() {
    this.uid = await this.authenticate();
    this.logger.log(`Conectado a Odoo con uid: ${this.uid}`);
  }

  private authenticate(): Promise<number> {
    return new Promise((resolve, reject) => {
      const client = xmlrpc.createSecureClient(`${this.url}/xmlrpc/2/common`);
      client.methodCall(
        'authenticate',
        [this.db, this.user, this.apiKey, {}],
        (err, uid) => {
          if (err) return reject(err);
          if (!uid) return reject(new Error('Credenciales incorrectas'));
          resolve(uid);
        },
      );
    });
  }

  getProducts(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const client = xmlrpc.createSecureClient(`${this.url}/xmlrpc/2/object`);
      client.methodCall(
        'execute_kw',
        [
          this.db,
          this.uid,
          this.apiKey,
          'product.template',
          'search_read',
          [[['type', 'in', ['consu', 'product']]]],
          {
            fields: [
              'name', // Nombre del producto en Odoo
              'description_sale', // Descripción corta visible al cliente
              'x_descripcion_web', // Descripción larga para el catálogo web (texto plano)
              'list_price', // Precio base sin IVA
              'barcode', // SKU / código de barras
              'qty_available', // Stock disponible en bodega
              'taxes_id', // IDs de impuestos — para calcular precio con IVA
              'write_date', // Fecha de última modificación — para webhook
              'x_publicar_web', // Boolean — true: visible en catálogo | false: oculto
              'x_grupo_variante', // Nombre del grupo / nombre web del producto
              'pos_categ_ids', // Marca del producto (ESSENCE, GARNIER, etc.)
              'x_categoria_web', // Categoría para el catálogo web
              'x_tipo_web', // Tipo (grupo o individual) para el catálogo web
            ],
            limit: 0,
          },
        ],
        (err, products) => {
          if (err) return reject(err);
          resolve(products);
        },
      );
    });
  }

  getTaxDetails(taxIds: number[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const client = xmlrpc.createSecureClient(`${this.url}/xmlrpc/2/object`);
      client.methodCall(
        'execute_kw',
        [
          this.db,
          this.uid,
          this.apiKey,
          'account.tax',
          'search_read',
          [[['id', 'in', taxIds]]],
          {
            fields: ['id', 'name', 'amount', 'amount_type', 'price_include'],
          },
        ],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
    });
  }

  getPosCategories(ids: number[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const client = xmlrpc.createSecureClient(`${this.url}/xmlrpc/2/object`);
      client.methodCall(
        'execute_kw',
        [
          this.db,
          this.uid,
          this.apiKey,
          'pos.category',
          'search_read',
          [[['id', 'in', ids]]],
          { fields: ['id', 'name'] },
        ],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
    });
  }

  getProductFields(): Promise<any> {
    return new Promise((resolve, reject) => {
      const client = xmlrpc.createSecureClient(`${this.url}/xmlrpc/2/object`);
      client.methodCall(
        'execute_kw',
        [
          this.db,
          this.uid,
          this.apiKey,
          'product.template',
          'fields_get',
          [],
          { attributes: ['string', 'type', 'help'] },
        ],
        (err, fields) => {
          if (err) return reject(err);
          resolve(fields);
        },
      );
    });
  }

  getProductoById(odooId: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const client = xmlrpc.createSecureClient(`${this.url}/xmlrpc/2/object`);
      client.methodCall(
        'execute_kw',
        [
          this.db,
          this.uid,
          this.apiKey,
          'product.template',
          'search_read',
          [[['id', '=', odooId]]],
          {
            fields: [
              'name',
              'description_sale',
              'x_descripcion_web',
              'list_price',
              'barcode',
              'qty_available',
              'taxes_id',
              'write_date',
              'x_publicar_web',
              'x_grupo_variante',
              'pos_categ_ids',
              'x_categoria_web',
              'x_tipo_web',
            ],
            limit: 1,
          },
        ],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
    });
  }
}
