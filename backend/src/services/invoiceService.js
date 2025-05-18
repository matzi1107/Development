// services/invoiceService.js
const db = require('../config/db');
const { Invoice, InvoiceItem, Payment, InvoiceDetail } = require('../models/invoiceModel');

// Alle Rechnungen abrufen
exports.getAllInvoices = async () => {
  try {
    const result = await db.query(`
      SELECT 
        i.reid, 
        i.renr, 
        i.cust, 
        i.proj_lnr, 
        i.issued_date, 
        i.due_date, 
        i.total_amount, 
        i.mwst, 
        i.mwstprz, 
        i.status, 
        i.notes, 
        i.naid, 
        i.nada, 
        i.aeda, 
        i.aeid,
        CONCAT(c.vname, ' ', c.nname) AS customer_name,
        c.betr AS customer_company,
        p.pname AS project_name,
        COALESCE((SELECT SUM(amount) FROM "int".payments WHERE reid = i.reid), 0) as paid_amount
      FROM "int".invoices i
      JOIN "int".customers c ON i.cust = c.cust
      LEFT JOIN "int".projects p ON i.cust = p.cust AND i.proj_lnr = p.lnr
      ORDER BY i.renr DESC
    `);
    // Für jede Rechnung die Positionen abrufen
    const invoices = [];
    for (const row of result.rows) {
      const itemsResult = await db.query(`
        SELECT description, quantity, unit_price, tax_rate, amount
        FROM "int".invoiceitems WHERE reid = $1 ORDER BY position_order
      `, [row.reid]);
      const items = itemsResult.rows;
      const totalNet = items.length > 0 ? items.reduce((sum, p) => sum + (+p.unit_price * (+p.quantity || 1)), 0) : (typeof row.total_amount === 'number' ? row.total_amount : parseFloat(row.total_amount || 0));
      const totalGross = items.length > 0 ? items.reduce((sum, p) => sum + (+p.amount || 0), 0) : +(totalNet * (1 + ((typeof row.mwstprz === 'number' ? row.mwstprz : parseFloat(row.mwstprz || 0)) / 100))).toFixed(2);
      invoices.push({
        ...row,
        items,
        totalNet,
        totalGross
      });
    }
    return invoices;
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Rechnungen: ${error.message}`);
  }
};

// Rechnung nach ID abrufen
exports.getInvoiceById = async (id) => {
  try {
    // 1. Rechnung mit Kundeninformationen abrufen
    const invoiceResult = await db.query(`
      SELECT 
        i.reid, 
        i.renr, 
        i.cust, 
        i.proj_lnr, 
        i.issued_date, 
        i.due_date, 
        i.total_amount, 
        i.mwst, 
        i.mwstprz, 
        i.status, 
        i.notes, 
        i.naid, 
        i.nada, 
        i.aeda, 
        i.aeid,
        CONCAT(c.vname, ' ', c.nname) AS customer_name,
        c.betr AS customer_company,
        p.pname AS project_name
      FROM "int".invoices i
      JOIN "int".customers c ON i.cust = c.cust
      LEFT JOIN "int".projects p ON i.cust = p.cust AND i.proj_lnr = p.lnr
      WHERE i.reid = $1
    `, [id]);
    
    if (invoiceResult.rows.length === 0) {
      return null;
    }
    
    const invoiceData = invoiceResult.rows[0];
    const invoice = new Invoice({
      reid: invoiceData.reid,
      renr: invoiceData.renr,
      cust: invoiceData.cust,
      proj_lnr: invoiceData.proj_lnr,
      issued_date: invoiceData.issued_date,
      due_date: invoiceData.due_date,
      total_amount: invoiceData.total_amount,
      mwst: invoiceData.mwst,
      mwstprz: invoiceData.mwstprz,
      status: invoiceData.status,
      notes: invoiceData.notes,
      naid: invoiceData.naid,
      nada: invoiceData.nada,
      aeda: invoiceData.aeda,
      aeid: invoiceData.aeid,
      customerName: invoiceData.customer_name,
      customerCompany: invoiceData.customer_company,
      projectName: invoiceData.project_name
    });
    
    // 2. Rechnungspositionen abrufen
    const itemsResult = await db.query(`
      SELECT 
        rpid, reid, description, quantity, unit_price, tax_rate, amount, position_order,
        naid, nada, aeda, aeid
      FROM "int".invoiceitems
      WHERE reid = $1
      ORDER BY position_order
    `, [id]);
    
    const items = itemsResult.rows.map(row => new InvoiceItem(row));
    
    // 3. Zahlungen abrufen
    const paymentsResult = await db.query(`
      SELECT 
        payid, reid, payda, amount, paymethod, ref, notes,
        naid, nada, aeda, aeid
      FROM "int".payments
      WHERE reid = $1
      ORDER BY payda
    `, [id]);
    
    const payments = paymentsResult.rows.map(row => new Payment(row));
    
    // 4. Zusammenfassung erstellen
    return new InvoiceDetail(invoice, items, payments);
  } catch (error) {
    console.error('getInvoiceById ERROR:', {
      id,
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Fehler beim Abrufen der Rechnung: ${error.message}`);
  }
};

// Rechnungsnummer generieren
exports.generateInvoiceNumber = async () => {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `RE-${currentYear}-`;
    
    // Höchste vorhandene Nummer mit diesem Präfix finden
    const result = await db.query(`
      SELECT MAX(CAST(SUBSTRING(renr FROM LENGTH($1) + 1) AS INTEGER)) AS max_number
      FROM "int".invoices 
      WHERE renr LIKE $1 || '%'
    `, [prefix]);
    
    const maxNumber = result.rows[0].max_number || 0;
    const nextNumber = maxNumber + 1;
    
    // Rechnungsnummer mit führenden Nullen formatieren (5-stellig)
    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  } catch (error) {
    throw new Error(`Fehler beim Generieren der Rechnungsnummer: ${error.message}`);
  }
};

// Neue Rechnung erstellen
exports.createInvoice = async (invoiceData, username) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Rechnungsnummer generieren
    const invoiceNumber = await this.generateInvoiceNumber();
    
    // 2. Rechnung in Datenbank einfügen
    const invoiceResult = await client.query(`
      INSERT INTO "int".invoices 
      (renr, cust, proj_lnr, issued_date, due_date, total_amount, mwst, mwstprz, status, notes, naid)
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING reid
    `, [
      invoiceNumber,
      invoiceData.cust,
      invoiceData.proj_lnr || null,
      invoiceData.issued_date,
      invoiceData.due_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 Tage
      invoiceData.total_amount,
      invoiceData.mwst,
      invoiceData.mwstprz,
      invoiceData.status || 'draft',
      invoiceData.notes || null,
      username
    ]);
    
    const invoiceId = invoiceResult.rows[0].reid;
    
    // 3. Rechnungspositionen einfügen
    if (invoiceData.items && invoiceData.items.length > 0) {
      for (let i = 0; i < invoiceData.items.length; i++) {
        const item = invoiceData.items[i];
        const positionOrder = i + 1;
        
        await client.query(`
          INSERT INTO "int".invoiceitems 
          (reid, description, quantity, unit_price, tax_rate, amount, position_order, naid)
          VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [
          invoiceId,
          item.description,
          item.quantity,
          item.unit_price,
          item.tax_rate,
          item.amount,
          positionOrder,
          username
        ]);
      }
    }
    
    await client.query('COMMIT');
    
    // 4. Neue Rechnung zurückgeben
    return this.getInvoiceById(invoiceId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Fehler beim Erstellen der Rechnung: ${error.message}`);
  } finally {
    client.release();
  }
};

// Rechnung aktualisieren
exports.updateInvoice = async (id, invoiceData, username) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Prüfen, ob die Rechnung existiert
    const invoiceExists = await client.query(
      'SELECT COUNT(*) FROM "int".invoices WHERE reid = $1',
      [id]
    );
    if (parseInt(invoiceExists.rows[0].count) === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    // 2. Zu aktualisierende Felder und Werte sammeln
    const updateFields = ['aeda = NOW()', 'aeid = $1'];
    const values = [username];
    let paramCount = 2;
    if (invoiceData.cust !== undefined) {
      updateFields.push(`cust = $${paramCount}`);
      values.push(invoiceData.cust);
      paramCount++;
    }
    if (invoiceData.proj_lnr !== undefined) {
      updateFields.push(`proj_lnr = $${paramCount}`);
      values.push(invoiceData.proj_lnr);
      paramCount++;
    }
    if (invoiceData.issued_date !== undefined) {
      updateFields.push(`issued_date = $${paramCount}`);
      values.push(invoiceData.issued_date);
      paramCount++;
    }
    if (invoiceData.due_date !== undefined) {
      updateFields.push(`due_date = $${paramCount}`);
      values.push(invoiceData.due_date);
      paramCount++;
    }
    if (invoiceData.total_amount !== undefined) {
      updateFields.push(`total_amount = $${paramCount}`);
      values.push(invoiceData.total_amount);
      paramCount++;
    }
    if (invoiceData.mwst !== undefined) {
      updateFields.push(`mwst = $${paramCount}`);
      values.push(invoiceData.mwst);
      paramCount++;
    }
    if (invoiceData.mwstprz !== undefined) {
      // Ensure mwstprz is integer
      updateFields.push(`mwstprz = $${paramCount}`);
      values.push(parseInt(invoiceData.mwstprz));
      paramCount++;
    }
    if (invoiceData.status !== undefined) {
      updateFields.push(`status = $${paramCount}`);
      values.push(invoiceData.status);
      paramCount++;
    }
    if (invoiceData.notes !== undefined) {
      updateFields.push(`notes = $${paramCount}`);
      values.push(invoiceData.notes);
      paramCount++;
    }
    // ID hinzufügen
    values.push(id);
    const query = `
      UPDATE "int".invoices 
      SET ${updateFields.join(', ')} 
      WHERE reid = $${paramCount}
    `;
    await client.query(query, values);

    // 3. Rechnungspositionen aktualisieren (delete all, insert new)
    if (Array.isArray(invoiceData.items)) {
      // Delete all old items
      await client.query('DELETE FROM "int".invoiceitems WHERE reid = $1', [id]);
      // Insert new items
      for (let i = 0; i < invoiceData.items.length; i++) {
        const item = invoiceData.items[i];
        const positionOrder = i + 1;
        await client.query(`
          INSERT INTO "int".invoiceitems 
          (reid, description, quantity, unit_price, tax_rate, amount, position_order, naid)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          id,
          item.description,
          item.quantity,
          item.unit_price,
          parseInt(item.tax_rate), // Ensure integer
          item.amount,
          positionOrder,
          username
        ]);
      }
    }

    // 4. Gesamtbetrag und MwSt der Rechnung aktualisieren
    await exports.updateInvoiceTotals(client, id, username);

    await client.query('COMMIT');
    // 5. Aktualisierte Rechnung zurückgeben
    return exports.getInvoiceById(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Fehler beim Aktualisieren der Rechnung: ${error.message}`);
  } finally {
    client.release();
  }
};

// Rechnung löschen
exports.deleteInvoice = async (id) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Prüfen, ob die Rechnung existiert
    const invoiceExists = await client.query(
      'SELECT COUNT(*) FROM "int".invoices WHERE reid = $1',
      [id]
    );
    
    if (parseInt(invoiceExists.rows[0].count) === 0) {
      return false;
    }
    
    // 2. Prüfen, ob Zahlungen vorhanden sind
    const paymentsExist = await client.query(
      'SELECT COUNT(*) FROM "int".payments WHERE reid = $1',
      [id]
    );
    
    if (parseInt(paymentsExist.rows[0].count) > 0) {
      throw new Error(`Die Rechnung mit ID ${id} kann nicht gelöscht werden, da bereits Zahlungen erfasst wurden. Bitte stornieren Sie die Rechnung stattdessen.`);
    }
    
    // 3. Rechnungspositionen löschen
    await client.query(
      'DELETE FROM "int".invoiceitems WHERE reid = $1',
      [id]
    );
    
    // 4. Rechnung löschen
    await client.query(
      'DELETE FROM "int".invoices WHERE reid = $1',
      [id]
    );
    
    await client.query('COMMIT');
    
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Rechnungspositionen abrufen
exports.getInvoiceItems = async (invoiceId) => {
  try {
    const result = await db.query(`
      SELECT 
        rpid, reid, description, quantity, unit_price, tax_rate, amount, position_order,
        naid, nada, aeda, aeid
      FROM "int".invoiceitems
      WHERE reid = $1
      ORDER BY position_order
    `, [invoiceId]);
    
    return result.rows.map(row => new InvoiceItem(row));
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Rechnungspositionen: ${error.message}`);
  }
};

// Rechnungsposition hinzufügen
exports.addInvoiceItem = async (invoiceId, itemData, username) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Nächste Position ermitteln
    const maxPositionResult = await client.query(`
      SELECT COALESCE(MAX(position_order), 0) AS max_position
      FROM "int".invoiceitems
      WHERE reid = $1
    `, [invoiceId]);
    
    const nextPosition = parseInt(maxPositionResult.rows[0].max_position) + 1;
    
    // 2. Rechnungsposition einfügen
    const result = await client.query(`
      INSERT INTO "int".invoiceitems 
      (reid, description, quantity, unit_price, tax_rate, amount, position_order, naid)
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      invoiceId,
      itemData.description,
      itemData.quantity,
      itemData.unit_price,
      itemData.tax_rate,
      itemData.amount,
      nextPosition,
      username
    ]);
    
    // 3. Gesamtbetrag und MwSt der Rechnung aktualisieren
    await this.updateInvoiceTotals(client, invoiceId, username);
    
    await client.query('COMMIT');
    
    return new InvoiceItem(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Fehler beim Hinzufügen der Rechnungsposition: ${error.message}`);
  } finally {
    client.release();
  }
};

// Rechnungsposition aktualisieren
exports.updateInvoiceItem = async (invoiceId, itemId, itemData, username) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Prüfen, ob die Rechnungsposition existiert
    const itemExists = await client.query(`
      SELECT COUNT(*) 
      FROM "int".invoiceitems 
      WHERE rpid = $1 AND reid = $2
    `, [itemId, invoiceId]);
    
    if (parseInt(itemExists.rows[0].count) === 0) {
      return null;
    }
    
    // 2. Zu aktualisierende Felder und Werte sammeln
    const updateFields = ['aeda = NOW()', 'aeid = $1'];
    const values = [username];
    let paramCount = 2;
    
    if (itemData.description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      values.push(itemData.description);
      paramCount++;
    }
    
    if (itemData.quantity !== undefined) {
      updateFields.push(`quantity = $${paramCount}`);
      values.push(itemData.quantity);
      paramCount++;
    }
    
    if (itemData.unit_price !== undefined) {
      updateFields.push(`unit_price = $${paramCount}`);
      values.push(itemData.unit_price);
      paramCount++;
    }
    
    if (itemData.tax_rate !== undefined) {
      updateFields.push(`tax_rate = $${paramCount}`);
      values.push(itemData.tax_rate);
      paramCount++;
    }
    
    if (itemData.amount !== undefined) {
      updateFields.push(`amount = $${paramCount}`);
      values.push(itemData.amount);
      paramCount++;
    }
    
    if (itemData.position_order !== undefined) {
      updateFields.push(`position_order = $${paramCount}`);
      values.push(itemData.position_order);
      paramCount++;
    }
    
    // Item-ID hinzufügen
    values.push(itemId);
    
    const query = `
      UPDATE "int".invoiceitems 
      SET ${updateFields.join(', ')} 
      WHERE rpid = $${paramCount}
    `;
    
    await client.query(query, values);
    
    // 3. Gesamtbetrag und MwSt der Rechnung aktualisieren
    await this.updateInvoiceTotals(client, invoiceId, username);
    
    // 4. Aktualisierte Rechnungsposition abrufen
    const result = await client.query(`
      SELECT * FROM "int".invoiceitems WHERE rpid = $1
    `, [itemId]);
    
    await client.query('COMMIT');
    
    return new InvoiceItem(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Fehler beim Aktualisieren der Rechnungsposition: ${error.message}`);
  } finally {
    client.release();
  }
};

// Rechnungsposition löschen
exports.deleteInvoiceItem = async (invoiceId, itemId, username) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Prüfen, ob die Rechnungsposition existiert
    const itemExists = await client.query(`
      SELECT COUNT(*) 
      FROM "int".invoiceitems 
      WHERE rpid = $1 AND reid = $2
    `, [itemId, invoiceId]);
    
    if (parseInt(itemExists.rows[0].count) === 0) {
      return false;
    }
    
    // 2. Rechnungsposition löschen
    await client.query(
      'DELETE FROM "int".invoiceitems WHERE rpid = $1',
      [itemId]
    );
    
    // 3. Gesamtbetrag und MwSt der Rechnung aktualisieren
    await this.updateInvoiceTotals(client, invoiceId, username);
    
    await client.query('COMMIT');
    
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Fehler beim Löschen der Rechnungsposition: ${error.message}`);
  } finally {
    client.release();
  }
};

// Zahlungen abrufen
exports.getInvoicePayments = async (invoiceId) => {
  try {
    const result = await db.query(`
      SELECT 
        payid, reid, payda, amount, paymethod, ref, notes,
        naid, nada, aeda, aeid
      FROM "int".payments
      WHERE reid = $1
      ORDER BY payda
    `, [invoiceId]);
    
    return result.rows.map(row => new Payment(row));
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Zahlungen: ${error.message}`);
  }
};

// Zahlung hinzufügen
exports.addInvoicePayment = async (invoiceId, paymentData, username) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Rechnung abrufen
    const invoiceResult = await client.query(`
      SELECT reid, total_amount, status
      FROM "int".invoices
      WHERE reid = $1
    `, [invoiceId]);
    
    if (invoiceResult.rows.length === 0) {
      throw new Error(`Rechnung mit ID ${invoiceId} nicht gefunden.`);
    }
    
    const invoice = invoiceResult.rows[0];
    
    // 2. Rechnung darf nicht storniert sein
    if (invoice.status === 'cancelled') {
      throw new Error('Für stornierte Rechnungen können keine Zahlungen erfasst werden.');
    }
    
    // 3. Bisher bezahlten Betrag ermitteln
    const paidAmountResult = await client.query(`
      SELECT COALESCE(SUM(amount), 0) AS paid_amount
      FROM "int".payments
      WHERE reid = $1
    `, [invoiceId]);
    
    const paidAmount = parseFloat(paidAmountResult.rows[0].paid_amount);
    
    // 4. Prüfen, ob mit der neuen Zahlung der Gesamtbetrag überschritten wird
    const newTotal = paidAmount + parseFloat(paymentData.amount);
    if (newTotal > parseFloat(invoice.total_amount)) {
      throw new Error(`Die Summe aller Zahlungen (inkl. dieser neuen Zahlung) würde den Rechnungsbetrag überschreiten. Maximaler Zahlungsbetrag für diese Rechnung: ${invoice.total_amount - paidAmount}`);
    }
    
    // 5. Zahlung einfügen
    const result = await client.query(`
      INSERT INTO "int".payments 
      (reid, payda, amount, paymethod, ref, notes, naid)
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      invoiceId,
      paymentData.payda || new Date(),
      paymentData.amount,
      paymentData.paymethod,
      paymentData.ref || null,
      paymentData.notes || null,
      username
    ]);
    
    // 6. Rechnungsstatus aktualisieren
    let newStatus = invoice.status;
    
    if (newTotal >= parseFloat(invoice.total_amount)) {
      newStatus = 'paid';
    } else if (invoice.status === 'draft' || invoice.status === 'overdue') {
      newStatus = 'sent';
    }
    
    if (newStatus !== invoice.status) {
      await client.query(`
        UPDATE "int".invoices 
        SET status = $1, aeda = NOW(), aeid = $2 
        WHERE reid = $3
      `, [newStatus, username, invoiceId]);
    }
    
    await client.query('COMMIT');
    
    return new Payment(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Zahlung löschen
exports.deleteInvoicePayment = async (invoiceId, paymentId, username) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Prüfen, ob die Zahlung existiert
    const paymentExists = await client.query(`
      SELECT COUNT(*) 
      FROM "int".payments 
      WHERE payid = $1 AND reid = $2
    `, [paymentId, invoiceId]);
    
    if (parseInt(paymentExists.rows[0].count) === 0) {
      return false;
    }
    
    // 2. Zahlung löschen
    await client.query(
      'DELETE FROM "int".payments WHERE payid = $1',
      [paymentId]
    );
    
    // 3. Rechnung und bezahlten Betrag abrufen
    const invoiceResult = await client.query(`
      SELECT i.reid, i.total_amount, i.status, i.issued_date,
        COALESCE(SUM(p.amount), 0) AS paid_amount
      FROM "int".invoices i
      LEFT JOIN "int".payments p ON i.reid = p.reid
      WHERE i.reid = $1
      GROUP BY i.reid, i.total_amount, i.status, i.issued_date
    `, [invoiceId]);
    
    const invoice = invoiceResult.rows[0];
    
    // 4. Rechnungsstatus aktualisieren
    let newStatus = invoice.status;
    
    if (parseFloat(invoice.paid_amount) === 0) {
      // Wenn keine Zahlungen mehr vorhanden sind
      newStatus = new Date(invoice.issued_date) <= new Date() ? 'sent' : 'draft';
    } else if (invoice.status === 'paid' && parseFloat(invoice.paid_amount) < parseFloat(invoice.total_amount)) {
      // Wenn vorher vollständig bezahlt, jetzt nur noch teilweise
      newStatus = 'sent';
    }
    
    // 5. Rechnungsstatus aktualisieren
    if (newStatus !== invoice.status) {
      await client.query(`
        UPDATE "int".invoices 
        SET status = $1, aeda = NOW(), aeid = $2 
        WHERE reid = $3
      `, [newStatus, username, invoiceId]);
    }
    
    await client.query('COMMIT');
    
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Ausstehende Rechnungen abrufen
exports.getOutstandingInvoices = async () => {
  try {
    const result = await db.query(`
      SELECT 
        i.reid,
        i.renr,
        i.cust,
        CONCAT(c.vname, ' ', c.nname) AS customer_name,
        c.betr AS customer_company,
        i.issued_date,
        i.due_date,
        i.total_amount,
        COALESCE(SUM(p.amount), 0) AS paid_amount,
        i.total_amount - COALESCE(SUM(p.amount), 0) AS outstanding_amount,
        CASE 
          WHEN i.status = 'paid' THEN 'paid'
          WHEN CURRENT_DATE > i.due_date AND i.status != 'paid' THEN 'overdue'
          ELSE i.status
        END AS effective_status,
        CASE 
          WHEN CURRENT_DATE > i.due_date AND i.status != 'paid' THEN 
            EXTRACT(DAY FROM (CURRENT_DATE - i.due_date))
          ELSE 0
        END AS days_overdue
      FROM 
        "int".invoices i
      JOIN 
        "int".customers c ON i.cust = c.cust
      LEFT JOIN 
        "int".payments p ON i.reid = p.reid
      WHERE 
        i.status != 'cancelled' AND
        i.status != 'paid'
      GROUP BY 
        i.reid, i.renr, i.cust, c.vname, c.nname, c.betr, 
        i.issued_date, i.due_date, i.total_amount, i.status
      HAVING
        i.total_amount > COALESCE(SUM(p.amount), 0)
      ORDER BY
        i.due_date
    `);
    
    return result.rows;
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der ausstehenden Rechnungen: ${error.message}`);
  }
};

// PDF-Daten für Rechnung abrufen
exports.getInvoicePdfData = async (id) => {
  try {
    // 1. Rechnung mit Details abrufen
    const invoiceDetail = await this.getInvoiceById(id);
    
    if (!invoiceDetail) {
      return null;
    }
    
    // 2. Kunde detailliert abrufen
    const customerResult = await db.query(`
      SELECT 
        cust, 
        vname, 
        nname, 
        COALESCE(betr, '') AS betr, 
        ida, 
        COALESCE(str, '') AS str, 
        postc, 
        COALESCE(town, '') AS town, 
        aeda, 
        COALESCE(aeid, '') AS aeid, 
        nada, 
        COALESCE(naid, '') AS naid 
      FROM "int".customers 
      WHERE cust = $1
    `, [invoiceDetail.invoice.cust]);
    
    const customer = customerResult.rows[0];
    
    // 3. Unternehmensinformationen abrufen
    const companySettingsResult = await db.query(`
      SELECT compid, varkey, varval
      FROM "int".oscomp
      WHERE compid = 1
    `);
    
    const companyInfo = {};
    companySettingsResult.rows.forEach(row => {
      companyInfo[row.varkey] = row.varval;
    });
    
    // 4. Daten zusammenführen
    return {
      invoice: invoiceDetail.invoice,
      customer: customer,
      items: invoiceDetail.items,
      payments: invoiceDetail.payments,
      companyInfo: {
        name: companyInfo.name || 'One Shot OG',
        street: companyInfo.street || '',
        postalCode: companyInfo.postalCode || '',
        city: companyInfo.city || '',
        phone: companyInfo.phone || '',
        email: companyInfo.email || '',
        website: companyInfo.website || '',
        taxId: companyInfo.taxId || '',
        vatId: companyInfo.vatId || '',
        bankName: companyInfo.bankName || '',
        iban: companyInfo.iban || '',
        bic: companyInfo.bic || ''
      },
      paidAmount: invoiceDetail.paidAmount,
      outstandingAmount: invoiceDetail.outstandingAmount
    };
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der PDF-Daten: ${error.message}`);
  }
};

// Hilfsmethoden
// Gesamtbetrag und MwSt der Rechnung aktualisieren
exports.updateInvoiceTotals = async (client, invoiceId, username) => {
  try {
    // 1. Netto-Gesamtbetrag der Rechnungspositionen berechnen
    const totalsResult = await client.query(`
      SELECT 
        SUM(amount) AS net_total,
        AVG(tax_rate) AS avg_tax_rate
      FROM "int".invoiceitems 
      WHERE reid = $1
    `, [invoiceId]);
    
    const totals = totalsResult.rows[0];
    
    // 2. MwSt und Gesamtbetrag berechnen
    const netTotal = parseFloat(totals.net_total || 0);
    const taxRate = Math.round(parseFloat(totals.avg_tax_rate || 20));
    const taxAmount = Math.round(netTotal * (taxRate / 100) * 100) / 100;
    const totalAmount = netTotal + taxAmount;
    
    // 3. Rechnung aktualisieren
    await client.query(`
      UPDATE "int".invoices 
      SET total_amount = $1, 
          mwst = $2, 
          mwstprz = $3, 
          aeda = NOW(), 
          aeid = $4
      WHERE reid = $5
    `, [
      totalAmount,
      taxAmount,
      taxRate,
      username,
      invoiceId
    ]);
  } catch (error) {
    throw error;
  }
};

module.exports = exports;