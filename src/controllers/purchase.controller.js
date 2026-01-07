const PurchaseOrder = require("../models/PurchaseOrder");
const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");

// ===============================
// CREATE Purchase Order
// ===============================
exports.createPurchaseOrder = async (req, res) => {
  try {
    const data = req.body;

    // Parse products (FormData support)
    if (typeof data.products === "string") {
      data.products = JSON.parse(data.products);
    }

    // Ensure paymentReceived is a number
    if (data.paymentReceived !== undefined) {
      data.paymentReceived = Number(data.paymentReceived) || 0;
    }

    // Handle invoice upload
    if (req.files?.invoice?.[0]) {
      data.invoiceFile = `uploads/${req.files.invoice[0].filename}`;
    }

    // Validate products
    if (!Array.isArray(data.products) || data.products.length === 0) {
      return res.status(400).json({
        message: "At least one product is required",
      });
    }

    // Handle products, sizes, quantity & images
    data.products = data.products.map((product, index) => {
      if (!product.productName) {
        throw new Error("Product name is required");
      }

      if (!Array.isArray(product.sizes) || product.sizes.length === 0) {
        throw new Error(
          `Product "${product.productName}" must have at least one size`
        );
      }

      let totalQuantity = 0;

      const sizes = product.sizes.map((size) => {
        if (!size.sizeName || size.quantity === undefined) {
          throw new Error(
            `Each size must have sizeName and quantity in product "${product.productName}"`
          );
        }

        const qty = Number(size.quantity);
        if (qty < 0) {
          throw new Error(
            `Quantity cannot be negative for size "${size.sizeName}"`
          );
        }

        totalQuantity += qty;

        return {
          sizeName: size.sizeName,
          quantity: qty,
        };
      });

      return {
        productName: product.productName,
        sizes,
        quantity: totalQuantity,
        productImage: req.files?.productImages?.[index]
          ? `uploads/${req.files.productImages[index].filename}`
          : null,
      };
    });

    const order = await PurchaseOrder.create(data);
    res.status(201).json(order);
  } catch (err) {
    console.error("Create Purchase Order Error:", err);
    res.status(500).json({
      message: "Failed to create purchase order",
      error: err.message,
    });
  }
};

// ===============================
// GET all purchase orders by client
// ===============================
exports.getPurchaseByClient = async (req, res) => {
  try {
    const orders = await PurchaseOrder.find({
      clientId: req.params.clientId,
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch purchase orders",
      error: err.message,
    });
  }
};

// ===============================
// GET single purchase order
// ===============================
exports.getPurchaseById = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Purchase order not found",
      });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch purchase order",
      error: err.message,
    });
  }
};

// ===============================
// UPDATE full purchase order
// ===============================
exports.updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Parse products if sent as string
    if (typeof data.products === "string") {
      data.products = JSON.parse(data.products);
    }

    // Ensure paymentReceived is number
    if (data.paymentReceived !== undefined) {
      data.paymentReceived = Number(data.paymentReceived) || 0;
    }

    const po = await PurchaseOrder.findById(id);
    if (!po) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    // Update top-level fields
    po.poNumber = data.poNumber ?? po.poNumber;
    po.trackingNumber = data.trackingNumber ?? po.trackingNumber;
    po.status = data.status ?? po.status;
    po.paymentReceived = data.paymentReceived ?? po.paymentReceived;

    // Update invoice
    if (req.files?.invoice?.[0]) {
      po.invoiceFile = `uploads/${req.files.invoice[0].filename}`;
    }

    // Update products ONLY if provided
    if (Array.isArray(data.products)) {
      po.products = data.products.map((product, index) => {
        const oldProduct = po.products[index] || {};

        const sizes = Array.isArray(product.sizes)
          ? product.sizes.map((s) => ({
              sizeName: s.sizeName,
              quantity: Number(s.quantity) || 0,
            }))
          : oldProduct.sizes || [];

        const quantity = sizes.reduce((sum, s) => sum + s.quantity, 0);

        return {
          productName: product.productName ?? oldProduct.productName,
          sizes,
          quantity,
          productImage: req.files?.productImages?.[index]
            ? `uploads/${req.files.productImages[index].filename}`
            : oldProduct.productImage,
        };
      });
    }

    const updatedPO = await po.save();
    res.json(updatedPO);
  } catch (err) {
    console.error("Update Purchase Order Error:", err);
    res.status(500).json({
      message: "Failed to update purchase order",
      error: err.message,
    });
  }
};

// ===============================
// UPDATE Purchase Order Status ONLY
// ===============================
exports.updatePurchaseStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    // Find the purchase order
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    // Update status and track who updated
    order.status = status;
    order.statusUpdatedBy = {
      email: req.user.email, // from logged-in user
      role: req.user.role,   // from logged-in user
    };
    order.statusUpdatedAt = new Date();

    await order.save();

    res.json(order);
  } catch (err) {
    console.error("Update purchase order status error:", err);
    res.status(500).json({
      message: "Failed to update purchase status",
      error: err.message,
    });
  }
};


// ===============================
// DELETE purchase order
// ===============================
exports.deletePurchaseOrder = async (req, res) => {
  try {
    const deleted = await PurchaseOrder.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        message: "Purchase order not found",
      });
    }

    res.json({ message: "Purchase order deleted" });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete purchase order",
      error: err.message,
    });
  }
};



// Download PO Excel
exports.downloadPurchaseCSV = async (req, res) => {
  try {
    const { id } = req.params;

    const po = await PurchaseOrder.findById(id);
    if (!po) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Purchase Order");

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const normalizeSize = (s) => s.trim().toLowerCase();

    /* =========================
       PO HEADER SECTION
    ========================= */
    const headerRows = [
      ["PO Number:", po.poNumber],
      ["Tracking Number:", po.trackingNumber || ""],
      ["Status:", po.status],
      [
        "Invoice:",
        po.invoiceFile
          ? { text: "View Invoice", hyperlink: `${baseUrl}/${po.invoiceFile}` }
          : "—",
      ],
    ];

    headerRows.forEach(([label, value]) => {
      const row = sheet.addRow([label, value]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" }, 
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle" };
      });

      row.getCell(1).font = { bold: true };
      row.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFEFEF" },
      };
    });

    sheet.addRow([]);

    /* =========================
       PRODUCTS TITLE
    ========================= */
    const productsTitleRow = sheet.addRow(["Products"]);
    productsTitleRow.getCell(1).font = { bold: true, size: 14 };
    productsTitleRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFEFEF" },
    };
    productsTitleRow.getCell(1).border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    sheet.addRow([]);

    /* =========================
       COLLECT UNIQUE SIZES
    ========================= */
    const sizeMap = new Map();

    po.products.forEach((product) => {
      product.sizes.forEach((s) => {
        const key = normalizeSize(s.sizeName);
        if (!sizeMap.has(key)) {
          sizeMap.set(key, s.sizeName.trim());
        }
      });
    });

    const sizeColumns = Array.from(sizeMap.values());

    /* =========================
       TABLE HEADER (ADD TOTAL QTY)
    ========================= */
    const tableHeaders = [
      "Product Name",
      ...sizeColumns,
      "Total Qty",
      "Product Image",
    ];
    sheet.addRow(tableHeaders);

    const headerRow = sheet.getRow(sheet.rowCount);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    /* =========================
       PRODUCT ROWS (CALCULATE TOTAL)
    ========================= */
    po.products.forEach((product) => {
      const rowData = [product.productName];
      let totalQty = 0;

      sizeColumns.forEach((displaySize) => {
        const match = product.sizes.find(
          (s) => normalizeSize(s.sizeName) === normalizeSize(displaySize)
        );
        const qty = match ? Number(match.quantity) : "";
        rowData.push(qty);
        if (qty) totalQty += Number(qty);
      });

      // Total Quantity Column
      rowData.push(totalQty);

      // Product Image
      rowData.push(
        product.productImage
          ? {
              text: "View Image",
              hyperlink: `${baseUrl}/${product.productImage}`,
            }
          : ""
      );

      const row = sheet.addRow(rowData);

      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          vertical: "middle",
          horizontal: colNumber === 1 ? "left" : "center",
          wrapText: true,
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        // Highlight Total Qty column
        if (tableHeaders[colNumber - 1] === "Total Qty") {
          cell.font = { bold: true };
        }
      });
    });

    /* =========================
       AUTO COLUMN WIDTH
    ========================= */
    sheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const value = cell.value?.text || cell.value || "";
        maxLength = Math.max(maxLength, value.toString().length);
      });
      column.width = maxLength + 4;
    });

    /* =========================
       SEND FILE
    ========================= */
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${po.poNumber.replace(/ /g, "_")}.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Download PO Excel Error:", err);
    res.status(500).json({
      message: "Failed to download purchase order",
      error: err.message,
    });
  }
};
