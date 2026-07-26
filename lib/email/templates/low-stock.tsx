import { Section, Text } from "@react-email/components";
import EmailLayout, { ActionButton, Heading, Paragraph } from "./_layout";
import { color, font } from "../theme";

export interface LowStockItem {
  itemName: string;
  quantity: number;
  threshold: number;
  unit: string;
  category: string;
}

export interface LowStockEmailProps {
  items: LowStockItem[];
  url: string;
}

/**
 * Daily low-stock digest — PRODUCT.md: "flag low stock before it becomes a
 * Sunday-morning problem."
 *
 * Rendered as a table because the recipient is scanning for names and numbers,
 * not reading prose. Quantity is coloured critical when it has hit zero,
 * caution otherwise — the same at-a-glance triage the inventory list gives.
 */
export default function LowStockEmail({ items, url }: LowStockEmailProps) {
  const count = items.length;

  return (
    <EmailLayout
      preview={`${count} item${count === 1 ? "" : "s"} at or below minimum stock`}
    >
      <Heading>Low stock</Heading>
      <Paragraph muted>
        {count} item{count === 1 ? " is" : "s are"} at or below the minimum
        threshold. Worth restocking before the weekend.
      </Paragraph>

      <Section
        style={{
          border: `1px solid ${color.line}`,
          borderRadius: "10px",
          overflow: "hidden",
          marginBottom: "20px",
        }}
      >
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          width="100%"
          style={{ borderCollapse: "collapse" }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left" as const,
                  padding: "10px 14px",
                  backgroundColor: color.surfaceSunken,
                  borderBottom: `1px solid ${color.line}`,
                  fontFamily: font.body,
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase" as const,
                  color: color.inkFaint,
                }}
              >
                Item
              </th>
              <th
                style={{
                  textAlign: "right" as const,
                  padding: "10px 14px",
                  backgroundColor: color.surfaceSunken,
                  borderBottom: `1px solid ${color.line}`,
                  fontFamily: font.body,
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase" as const,
                  color: color.inkFaint,
                  whiteSpace: "nowrap" as const,
                }}
              >
                Qty / Min
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={`${item.itemName}-${i}`}>
                <td
                  style={{
                    padding: "12px 14px",
                    borderTop:
                      i === 0 ? "none" : `1px solid ${color.lineSubtle}`,
                    fontFamily: font.body,
                    fontSize: "15px",
                    color: color.ink,
                  }}
                >
                  {item.itemName}
                  <br />
                  <span style={{ fontSize: "12px", color: color.inkFaint }}>
                    {item.category}
                  </span>
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    borderTop:
                      i === 0 ? "none" : `1px solid ${color.lineSubtle}`,
                    fontFamily: font.body,
                    fontSize: "15px",
                    fontWeight: 700,
                    textAlign: "right" as const,
                    whiteSpace: "nowrap" as const,
                    color:
                      item.quantity === 0
                        ? color.statusCritical
                        : color.statusCaution,
                  }}
                >
                  {item.quantity} / {item.threshold}
                  <br />
                  <span style={{ fontSize: "12px", fontWeight: 400, color: color.inkFaint }}>
                    {item.unit}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <ActionButton href={url} label="Open inventory" />

      <Text
        style={{
          margin: "20px 0 0",
          color: color.inkFaint,
          fontSize: "13px",
          lineHeight: 1.5,
        }}
      >
        Thresholds are set per item when adding or editing it.
      </Text>
    </EmailLayout>
  );
}

LowStockEmail.PreviewProps = {
  items: [
    {
      itemName: "XLR Cable 10m",
      quantity: 2,
      threshold: 6,
      unit: "Pieces",
      category: "Cables",
    },
    {
      itemName: "AA Batteries",
      quantity: 0,
      threshold: 24,
      unit: "Packs",
      category: "Consumables",
    },
    {
      itemName: "Gaffer Tape",
      quantity: 1,
      threshold: 4,
      unit: "Rolls",
      category: "Consumables",
    },
  ],
  url: "https://example.com/inventory",
} satisfies LowStockEmailProps;
