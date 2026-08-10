import { Document, HeadingLevel, Packer, Paragraph } from "docx"

export type ExportableSummary = {
  sourceGroupJid: string
  periodStart: Date
  periodEnd: Date
  bodyMd: string
}

export async function buildSummaryDocx(summary: ExportableSummary): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: "ASA Digest Summary", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: `Group: ${summary.sourceGroupJid}` }),
          new Paragraph({
            text: `Periode: ${new Date(summary.periodStart).toLocaleDateString()} — ${new Date(summary.periodEnd).toLocaleDateString()}`,
          }),
          new Paragraph({ text: "" }),
          ...summary.bodyMd.split("\n").map((line) => new Paragraph({ text: line })),
        ],
      },
    ],
  })
  return Packer.toBuffer(doc)
}
