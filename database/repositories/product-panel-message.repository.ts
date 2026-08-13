import {
  ProductPanelMessageModel,
  type ProductPanelMessageDocument,
  type IProductPanelMessage,
  type ProductPanelKey,
} from "../models/product-panel-message.model";

export const productPanelMessageRepository = {
  async findByGuildAndProduct(
    guildId: string,
    productType: ProductPanelKey,
  ): Promise<ProductPanelMessageDocument | null> {    return ProductPanelMessageModel.findOne({ guildId, productType }).exec();
  },

  async findAll(): Promise<ProductPanelMessageDocument[]> {
    return ProductPanelMessageModel.find().exec();
  },

  async upsert(
    data: Pick<IProductPanelMessage, "guildId" | "productType" | "channelId" | "messageId">,
  ): Promise<ProductPanelMessageDocument> {
    return ProductPanelMessageModel.findOneAndUpdate(
      { guildId: data.guildId, productType: data.productType },
      { $set: data },
      { new: true, upsert: true },
    ).exec();
  },
};
