#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { ProductsAppStack } from '../lib/productsApp-stack'; 
import { EcommerceAPIStack } from '../lib/ecommerceAPI-stack';
import { ProductsAppLayersStack } from '../lib/productsAppLayers-stack';

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

const productsAppStack = new ProductsAppStack(app,"ProductsApp", {
  tags:tags,
  env: env
});

productsAppStack.addDependency(productsAppLayersStack);

const ecommerceAPIStack = new EcommerceAPIStack(app, "EcommerceAPI",{
  tags:tags,
  env: env,
  productsFetchHandler: productsAppStack.productFetchHanlder,
  productsAdminHandler: productsAppStack.productAdminHanlder
});

ecommerceAPIStack.addDependency(productsAppStack);