export const BENCHMARK_JSON_ELEMENT_COUNTS = [1, 4, 8, 16, 32, 64, 128] as const;

const FIRST_NAMES = ['Alex', 'Jamie', 'Morgan', 'Riley', 'Taylor', 'Casey', 'Jordan', 'Avery'];
const LAST_NAMES = ['Chen', 'Rivera', 'Patel', 'Nguyen', 'Smith', 'Garcia', 'Brown', 'Khan'];
const PRODUCT_CATEGORIES = ['tea', 'coffee', 'accessories', 'books', 'ceramics', 'snacks'];
const ORDER_STATUSES = ['draft', 'paid', 'packed', 'shipped', 'delivered', 'returned'];
const REGIONS = ['north', 'south', 'east', 'west', 'central'];
const SHIPPING_METHODS = ['standard', 'express', 'pickup'];
const PRIORITIES = ['low', 'normal', 'high'];

export function buildBenchmarkJsonDocument(elementCount: number): string {
  const rows = Array.from({ length: elementCount }, (_, index) => buildBenchmarkElement(index));
  return JSON.stringify(rows, null, 2);
}

function buildBenchmarkElement(index: number): Record<string, unknown> {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[index % LAST_NAMES.length];
  const orderNumber = String(index + 1).padStart(5, '0');

  return {
    orderId: `ORD-${orderNumber}`,
    customerName: `${firstName} ${lastName}`,
    customerEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`,
    customerPhone: `+1-555-${String(100 + (index % 900)).padStart(3, '0')}-${String(1000 + index).slice(-4)}`,
    customerId: `CUST-${String(7000 + index)}`,
    productCategory: PRODUCT_CATEGORIES[index % PRODUCT_CATEGORIES.length],
    orderStatus: ORDER_STATUSES[index % ORDER_STATUSES.length],
    quantity: (index % 5) + 1,
    region: REGIONS[index % REGIONS.length],
    shippingMethod: SHIPPING_METHODS[index % SHIPPING_METHODS.length],
    priority: PRIORITIES[index % PRIORITIES.length],
    orderedAt: `2026-06-${String((index % 28) + 1).padStart(2, '0')}T09:00:00.000Z`,
    note: `Customer selected ${SHIPPING_METHODS[index % SHIPPING_METHODS.length]} delivery for ${PRODUCT_CATEGORIES[index % PRODUCT_CATEGORIES.length]}.`,
  };
}
