#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { ProductsAppStack } from '../lib/productsApp-stack'; 
import { EcommerceAPIStack } from '../lib/ecommerceAPI-stack';
import { ProductsAppLayersStack } from '../lib/productsAppLayers-stack';
import { EventsDdbStack } from '../lib/eventsDdb-stack';
import { OrdersAppLayersStack } from '../lib/ordersAppLayers-stack';
import { OrdersAppStack } from '../lib/ordersApp-stack';

const app = new cdk.App();

const env: cdk.Environment = {
  account:"627010764306",
  region:"us-east-1"
}

const tags = {
  cost: "ECommerceAWS",
  team: "Bruno"
}
const productsAppLayersStack = new ProductsAppLayersStack(app,"ProductsAppLayers",{
  tags:tags,
  env: env
});

const eventsDdbStack = new EventsDdbStack(app,"EventsDdb",{
  tags:tags,
  env: env
})
const productsAppStack = new ProductsAppStack(app,"ProductsApp", {
  tags:tags,
  env: env,
  eventsDdb: eventsDdbStack.table
});

productsAppStack.addDependency(productsAppLayersStack);
productsAppStack.addDependency(eventsDdbStack);

const ordersAppLayersStack = new OrdersAppLayersStack(app,"OrdersAppLayers",{
  tags:tags,
  env: env
});

const ordersAppStack = new OrdersAppStack(app,"OrdersApp",{
  tags:tags,
  env: env,
  productsDdb: productsAppStack.productsDdb,
  eventsDdb: eventsDdbStack.table
});
ordersAppStack.addDependency(productsAppStack);
ordersAppStack.addDependency(ordersAppLayersStack);
ordersAppStack.addDependency(eventsDdbStack);

const ecommerceAPIStack = new EcommerceAPIStack(app, "EcommerceAPI",{
  tags:tags,
  env: env,
  productsFetchHandler: productsAppStack.productFetchHanlder,
  productsAdminHandler: productsAppStack.productAdminHanlder,
  ordersHandler: ordersAppStack.ordersHandler
});

ecommerceAPIStack.addDependency(productsAppStack);
ecommerceAPIStack.addDependency(ordersAppStack);