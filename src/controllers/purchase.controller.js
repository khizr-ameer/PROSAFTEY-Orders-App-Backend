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
// UPDATE purchase status only
// ===============================
exports.updatePurchaseStatus = async (req, res) => {
  try {
    const order = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        message: "Purchase order not found",
      });
    }

    res.json(order);
  } catch (err) {
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


// Download PO CSV
// Download PO Excel
exports.downloadPurchaseCSV = async (req, res) => {
  try {
    const { id } = req.params;

    const po = await PurchaseOrder.findById(id);
    if (!po) return res.status(404).json({ message: "Purchase order not found" });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Purchase Order");

    // Add headers
    sheet.columns = [
      { header: "PO Number", key: "poNumber", width: 25 },
      { header: "Tracking Number", key: "trackingNumber", width: 20 },
      { header: "Status", key: "status", width: 20 },
      { header: "Invoice", key: "invoice", width: 25 },
      { header: "Product Name", key: "productName", width: 30 },
      { header: "Sizes", key: "sizes", width: 40 },
      { header: "Product Image", key: "productImage", width: 40 },
    ];

    // Make headers bold
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    // ======================
    // Add data rows
    // ======================
    po.products.forEach((p, index) => {
      // Combine sizes in one cell: S:50, M:25, L:25
      const sizeText = p.sizes.map((s) => `${s.sizeName}:${s.quantity}`).join(", ");

      // Hyperlink for product image
      const imageLink = p.productImage
        ? { text: "View Image", hyperlink: `${req.protocol}://${req.get("host")}/${p.productImage}` }
        : "";

      // Hyperlink for invoice (only first row)
      const invoiceLink =
        index === 0 && po.invoiceFile
          ? { text: "View Invoice", hyperlink: `${req.protocol}://${req.get("host")}/${po.invoiceFile}` }
          : "";

      // Only show PO-level info in first row
      sheet.addRow({
        poNumber: index === 0 ? po.poNumber : "",
        trackingNumber: index === 0 ? po.trackingNumber : "",
        status: index === 0 ? po.status : "",
        invoice: invoiceLink,
        productName: p.productName,
        sizes: sizeText,
        productImage: imageLink,
      });
    });

    // ======================
    // Set alignment + wrap text
    // ======================
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      });
    });

    // ======================
    // Send file
    // ======================
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
    res.status(500).json({ message: "Failed to download purchase order", error: err.message });
  }
};
