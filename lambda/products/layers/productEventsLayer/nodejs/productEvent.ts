export enum ProductEventType {
    CREATED = "PRPODUCT_CREATED",
    UPDATED = "PRODUCT_UPDATED",
    DELETED = "PRODUCT_DELETED"
}

export interface ProductEvent {
    requestId: string;
    eventType: ProductEventType;
    productId: string;
    productCode: string;
    productPrice: number;
    email: string;
}