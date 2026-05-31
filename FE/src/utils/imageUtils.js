export const isImageSource = (value) =>
  typeof value === 'string' && /^(https?:\/\/|\/|data:image\/|blob:)/i.test(value);

export const getProductThumbnail = (product, fallback = '🧸') => (
  (product?.images || []).find((image) => image.thumbnail)?.imageUrl ||
  product?.images?.[0]?.imageUrl ||
  fallback
);
