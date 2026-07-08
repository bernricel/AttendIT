import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import { formatDateTime, formatIsoDate } from "./dateTime"

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "_")
}

function formatLongDate(value) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function toLateStatus(row) {
  const status = normalizeStatus(row.attendance_status)
  if (status === "late") return "Late"
  if (status === "on_time") return "On Time"
  return "N/A"
}

function toCheckOutState(row) {
  return row.time_out ? "Completed" : "Missing"
}

function slugify(value) {
  return String(value || "attendance_logs")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export function exportAttendanceLogsPdf({ session, rows, filters }) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
    compress: true,
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const exportDate = new Date()
  const filterSummary = [
    filters.attendanceStatus || "All attendance statuses",
    filters.signatureStatus || "All signature statuses",
    `Sort: ${filters.sortBy} (${filters.sortOrder})`,
  ].join("  |  ")

  doc.setFillColor(11, 33, 64)
  doc.roundedRect(margin, margin, pageWidth - margin * 2, 86, 16, 16, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.text(session.name || "Attendance Logs", margin + 18, margin + 30)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`Session Date: ${formatLongDate(session.start_time)}`, margin + 18, margin + 52)
  doc.text(`Department: ${session.department || "-"}`, margin + 18, margin + 68)

  doc.text(
    `Export Date: ${exportDate.toLocaleString()}`,
    pageWidth - margin - 18,
    margin + 30,
    { align: "right" },
  )
  doc.text(
    `Status: ${session.lifecycle_status || (session.is_active ? "Active" : "Ended")}`,
    pageWidth - margin - 18,
    margin + 52,
    { align: "right" },
  )
  doc.text(
    `Rows Included: ${rows.length}`,
    pageWidth - margin - 18,
    margin + 68,
    { align: "right" },
  )

  doc.setTextColor(66, 66, 66)
  doc.setFontSize(9)
  doc.text(filterSummary, margin, margin + 112)

  autoTable(doc, {
    startY: margin + 126,
    margin: { top: margin, right: margin, bottom: margin + 20, left: margin },
    head: [[
      "Faculty Name",
      "Email",
      "Check In",
      "Check Out",
      "Attendance Status",
      "Signature Status",
      "Late Status",
      "Check-out Info",
    ]],
    body: rows.map((row) => ([
      row.faculty_name || "-",
      row.email || "-",
      formatDateTime(row.time_in),
      formatDateTime(row.time_out),
      row.attendance_status || "-",
      row.signature_status || "-",
      toLateStatus(row),
      toCheckOutState(row),
    ])),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 6,
      lineColor: [224, 224, 224],
      lineWidth: 0.4,
      textColor: [40, 40, 40],
      valign: "middle",
    },
    headStyles: {
      fillColor: [11, 33, 64],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 249, 251],
    },
    bodyStyles: {
      minCellHeight: 20,
    },
  })

  const totalPages = doc.getNumberOfPages()
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber)
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(90, 90, 90)
    doc.text(
      `${session.name || "Attendance Logs"}  |  Page ${pageNumber} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 14,
      { align: "center" },
    )
  }

  doc.save(`${slugify(session.name)}_${formatIsoDate(session.start_time)}_attendance.pdf`)
}
