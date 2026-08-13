import { Schema, model, type Document, type Model } from "mongoose";
import { ITEM_TUMBAL_PANEL_KEY, type ProductType } from "../../shared/products";

export type ProductPanelKey = ProductType | typeof ITEM_TUMBAL_PANEL_KEY;

export interface IProductPanelMessage {
  guildId: string;
  productType: ProductPanelKey;
  channelId: string;
  messageId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductPanelMessageDocument = Document & IProductPanelMessage;

const productPanelMessageSchema = new Schema<ProductPanelMessageDocument>(
  {
    guildId: { type: String, required: true, index: true },
    productType: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: "product_panel_messages",
  },
);

productPanelMessageSchema.index({ guildId: 1, productType: 1 }, { unique: true });

export const ProductPanelMessageModel: Model<ProductPanelMessageDocument> =
  model<ProductPanelMessageDocument>("ProductPanelMessage", productPanelMessageSchema);
