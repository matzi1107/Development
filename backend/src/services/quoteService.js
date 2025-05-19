// services/quoteService.js
const db = require('../config/db');
const { Quote, QuoteItem, QuoteDetail } = require('../models/quoteModel');

// Alle Angebote abrufen
exports.getAllQuotes = async () => {
  try {
    const result = await db.query(`
      SELECT 
        q.qid, 
        q.qnr, 
        q.cust, 
        q.proj_lnr, 
        q.issued_date, 
        q.valid_until, 
        q.title,
        q.total_amount, 
        q.mwst, 
        q.mwstprz, 
        q.status, 
        q.notes, 
        q.naid, 
        q.nada, 
        q.aeda, 
        q.aeid,
        CONCAT(c.vname, ' ', c.nname) AS customer_name,
        c.betr AS customer_company,
        p.pname AS project_name
      FROM "int".quotes q
      JOIN "int".customers c ON q.cust = c.cust
      LEFT JOIN "int".projects p ON q.cust = p.cust AND q.proj_lnr = p.lnr
      ORDER BY q.issued_date DESC
    `);
    
    return result.rows.map(row => new Quote({
      qid: row.qid,
      qnr: row.qnr,
      cust: row.cust,
      proj_lnr: row.proj_lnr,
      issued_date: row.issued_date,
      valid_until: row.valid_until,
      title: row.title,
      total_amount: row.total_amount,
      mwst: row.mwst,
      mwstprz: row.mwstprz,
      status: row.status,
      notes: row.notes,
      naid: row.naid,
      nada: row.nada,
      aeda: row.aeda,
      aeid: row.aeid,
      customerName: row.customer_name,
      customerCompany: row.customer_company,
      projectName: row.project_name
    }));
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Angebote: ${error.message}`);
  }
};

// Angebot nach ID abrufen
exports.getQuoteById = async (id) => {
  try {
    // 1. Angebot mit Kundeninformationen abrufen
    const quoteResult = await db.query(`
      SELECT 
        q.qid, 
        q.qnr, 
        q.cust, 
        q.proj_lnr, 
        q.issued_date, 
        q.valid_until, 
        q.title,
        q.total_amount, 
        q.mwst, 
        q.mwstprz, 
        q.status, 
        q.notes, 
        q.naid, 
        q.nada, 
        q.aeda, 
        q.aeid,
        CONCAT(c.vname, ' ', c.nname) AS customer_name,
        c.betr AS customer_company,
        p.pname AS project_name
      FROM "int".quotes q
      JOIN "int".customers c ON q.cust = c.cust
      LEFT JOIN "int".projects p ON q.cust = p.cust AND q.proj_lnr = p.lnr
      WHERE q.qid = $1
    `, [id]);
    
    if (quoteResult.rows.length === 0) {
      return null;
    }
    
    const quoteData = quoteResult.rows[0];
    const quote = new Quote({
      qid: quoteData.qid,
      qnr: quoteData.qnr,
      cust: quoteData.cust,
      proj_lnr: quoteData.proj_lnr,
      issued_date: quoteData.issued_date,
      valid_until: quoteData.valid_until,
      title: quoteData.title,
      total_amount: quoteData.total_amount,
      mwst: quoteData.mwst,
      mwstprz: quoteData.mwstprz,
      status: quoteData.status,
      notes: quoteData.notes,
      naid: quoteData.naid,
      nada: quoteData.nada,
      aeda: quoteData.aeda,
      aeid: quoteData.aeid,
      customerName: quoteData.customer_name,
      customerCompany: quoteData.customer_company,
      projectName: quoteData.project_name
    });
    
    // 2. Angebotspositionen abrufen
    const itemsResult = await db.query(`
      SELECT 
        qpid, qid, description, quantity, unit_price, tax_rate, amount, position_order,
        naid, nada, aeda, aeid
      FROM "int".quoteitems
      WHERE qid = $1
      ORDER BY position_order
    `, [id]);
    
    const items = itemsResult.rows.map(row => new QuoteItem(row));
    
    // 3. Zusammenfassung erstellen
    return new QuoteDetail(quote, items);
  } catch (error) {
    throw new Error(`Fehler beim Abrufen des Angebots: ${error.message}`);
  }
};

// Angebotsnummer generieren
exports.generateQuoteNumber = async () => {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `A-${currentYear}-`;
    
    // Höchste vorhandene Nummer mit diesem Präfix finden
    const result = await db.query(`
      SELECT MAX(CAST(SUBSTRING(qnr FROM LENGTH($1) + 1) AS INTEGER)) AS max_number
      FROM "int".quotes 
      WHERE qnr LIKE $1 || '%'
    `, [prefix]);
    
    const maxNumber = result.rows[0].max_number || 0;
    const nextNumber = maxNumber + 1;
    
    // Angebotsnummer mit führenden Nullen formatieren (5-stellig)
    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  } catch (error) {
    throw new Error(`Fehler beim Generieren der Angebotsnummer: ${error.message}`);
  }
};

// Neues Angebot erstellen
exports.createQuote = async (quoteData, username) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Angebotsnummer generieren
    const quoteNumber = await this.generateQuoteNumber();
    
    // 2. Angebot in Datenbank einfügen
    const quoteResult = await client.query(`
      INSERT INTO "int".quotes 
      (qnr, cust, proj_lnr, issued_date, valid_until, title, total_amount, mwst, mwstprz, status, notes, naid)
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING qid
    `, [
      quoteNumber,
      quoteData.cust,
      quoteData.proj_lnr || null,
      quoteData.issued_date || new Date(),
      quoteData.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 Tage
      quoteData.title,
      quoteData.total_amount,
      quoteData.mwst,
      quoteData.mwstprz,
      quoteData.status || 'draft',
      quoteData.notes || null,
      username
    ]);
    
    const quoteId = quoteResult.rows[0].qid;
    
    // 3. Angebotspositionen einfügen
    if (quoteData.items && quoteData.items.length > 0) {
      for (let i = 0; i < quoteData.items.length; i++) {
        const item = quoteData.items[i];
        const positionOrder = i + 1;
        
        await client.query(`
          INSERT INTO "int".quoteitems 
          (qid, description, quantity, unit_price, tax_rate, amount, position_order, naid)
          VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          quoteId,
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
    
    // 4. Neues Angebot zurückgeben
    return this.getQuoteById(quoteId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Fehler beim Erstellen des Angebots: ${error.message}`);
  } finally {
    client.release();
  }
};

// Angebot aktualisieren
exports.updateQuote = async (id, quoteData, username) => {
  try {
    // 1. Prüfen, ob das Angebot existiert
    const quoteExists = await db.query(
      'SELECT COUNT(*) FROM "int".quotes WHERE qid = $1',
      [id]
    );
    
    if (parseInt(quoteExists.rows[0].count) === 0) {
      return null;
    }
    
    // 2. Zu aktualisierende Felder und Werte sammeln
    const updateFields = ['aeda = NOW()', 'aeid = $1'];
    const values = [username];
    let paramCount = 2;
    
    if (quoteData.cust !== undefined) {
      updateFields.push(`cust = $${paramCount}`);
      values.push(quoteData.cust);
      paramCount++;
    }
    
    if (quoteData.proj_lnr !== undefined) {
      updateFields.push(`proj_lnr = $${paramCount}`);
      values.push(quoteData.proj_lnr);
      paramCount++;
    }
    
    if (quoteData.issued_date !== undefined) {
      updateFields.push(`issued_date = $${paramCount}`);
      values.push(quoteData.issued_date);
      paramCount++;
    }
    
    if (quoteData.valid_until !== undefined) {
      updateFields.push(`valid_until = $${paramCount}`);
      values.push(quoteData.valid_until);
      paramCount++;
    }
    
    if (quoteData.title !== undefined) {
      updateFields.push(`title = $${paramCount}`);
      values.push(quoteData.title);
      paramCount++;
    }
    
    if (quoteData.total_amount !== undefined) {
      updateFields.push(`total_amount = $${paramCount}`);
      values.push(quoteData.total_amount);
      paramCount++;
    }
    
    if (quoteData.mwst !== undefined) {
      updateFields.push(`mwst = $${paramCount}`);
      values.push(quoteData.mwst);
      paramCount++;
    }
    
    if (quoteData.mwstprz !== undefined) {
      updateFields.push(`mwstprz = $${paramCount}`);
      values.push(quoteData.mwstprz);
      paramCount++;
    }
    
    if (quoteData.status !== undefined) {
      updateFields.push(`status = $${paramCount}`);
      values.push(quoteData.status);
      paramCount++;
    }
    
    if (quoteData.notes !== undefined) {
      updateFields.push(`notes = $${paramCount}`);
      values.push(quoteData.notes);
      paramCount++;
    }
    
    // ID hinzufügen
    values.push(id);
    
    const query = `
      UPDATE "int".quotes 
      SET ${updateFields.join(', ')} 
      WHERE qid = $${paramCount}
    `;
    
    await db.query(query, values);
    
    // 3. Aktualisiertes Angebot zurückgeben
    return this.getQuoteById(id);
  } catch (error) {
    throw new Error(`Fehler beim Aktualisieren des Angebots: ${error.message}`);
  }
};

// Angebot löschen
exports.deleteQuote = async (id) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Prüfen, ob das Angebot existiert
    const quoteExists = await client.query(
      'SELECT COUNT(*) FROM "int".quotes WHERE qid = $1',
      [id]
    );
    
    if (parseInt(quoteExists.rows[0].count) === 0) {
      return false;
    }
    
    // 2. Prüfen, ob bereits eine Rechnung aus diesem Angebot erstellt wurde
    // (Dies ist eine optionale Prüfung, die nur funktioniert, wenn die Rechnung eine Referenz zum Angebot hat)
    /*
    const invoiceExists = await client.query(
      'SELECT COUNT(*) FROM "int".invoices WHERE quote_id = $1',
      [id]
    );
    
    if (parseInt(invoiceExists.rows[0].count) > 0) {
      throw new Error(`Das Angebot mit ID ${id} kann nicht gelöscht werden, da bereits eine Rechnung daraus erstellt wurde.`);
    }
    */
    
    // 3. Angebotspositionen löschen
    await client.query(
      'DELETE FROM "int".quoteitems WHERE qid = $1',
      [id]
    );
    
    // 4. Angebot löschen
    await client.query(
      'DELETE FROM "int".quotes WHERE qid = $1',
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

// Angebotspositionen abrufen
exports.getQuoteItems = async (quoteId) => {
  try {
    const result = await db.query(`
      SELECT 
        qpid, qid, description, quantity, unit_price, tax_rate, amount, position_order,
        naid, nada, aeda, aeid
      FROM "int".quoteitems
      WHERE qid = $1
      ORDER BY position_order
    `, [quoteId]);
    
    return result.rows.map(row => new QuoteItem(row));
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der Angebotspositionen: ${error.message}`);
  }
};

// Angebotsposition hinzufügen
exports.addQuoteItem = async (quoteId, itemData, username) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Nächste Position ermitteln
    const maxPositionResult = await client.query(`
      SELECT COALESCE(MAX(position_order), 0) AS max_position
      FROM "int".quoteitems
      WHERE qid = $1
    `, [quoteId]);
    
    const nextPosition = parseInt(maxPositionResult.rows[0].max_position) + 1;
    
    // 2. Angebotsposition einfügen
    const result = await client.query(`
      INSERT INTO "int".quoteitems 
      (qid, description, quantity, unit_price, tax_rate, amount, position_order, naid)
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      quoteId,
      itemData.description,
      itemData.quantity,
      itemData.unit_price,
      itemData.tax_rate,
      itemData.amount,
      nextPosition,
      username
    ]);
    
    // 3. Gesamtbetrag und MwSt des Angebots aktualisieren
    await this.updateQuoteTotals(client, quoteId, username);
    
    await client.query('COMMIT');
    
    return new QuoteItem(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Fehler beim Hinzufügen der Angebotsposition: ${error.message}`);
  } finally {
    client.release();
  }
};

// Angebotsposition aktualisieren
exports.updateQuoteItem = async (quoteId, itemId, itemData, username) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Prüfen, ob die Angebotsposition existiert
    const itemExists = await client.query(`
      SELECT COUNT(*) 
      FROM "int".quoteitems 
      WHERE qpid = $1 AND qid = $2
    `, [itemId, quoteId]);
    
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
      UPDATE "int".quoteitems 
      SET ${updateFields.join(', ')} 
      WHERE qpid = $${paramCount}
    `;
    
    await client.query(query, values);
    
    // 3. Gesamtbetrag und MwSt des Angebots aktualisieren
    await this.updateQuoteTotals(client, quoteId, username);
    
    // 4. Aktualisierte Angebotsposition abrufen
    const result = await client.query(`
      SELECT * FROM "int".quoteitems WHERE qpid = $1
    `, [itemId]);
    
    await client.query('COMMIT');
    
    return new QuoteItem(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Fehler beim Aktualisieren der Angebotsposition: ${error.message}`);
  } finally {
    client.release();
  }
};

// Angebotsposition löschen
exports.deleteQuoteItem = async (quoteId, itemId, username) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Prüfen, ob die Angebotsposition existiert
    const itemExists = await client.query(`
      SELECT COUNT(*) 
      FROM "int".quoteitems 
      WHERE qpid = $1 AND qid = $2
    `, [itemId, quoteId]);
    
    if (parseInt(itemExists.rows[0].count) === 0) {
      return false;
    }
    
    // 2. Angebotsposition löschen
    await client.query(
      'DELETE FROM "int".quoteitems WHERE qpid = $1',
      [itemId]
    );
    
    // 3. Gesamtbetrag und MwSt des Angebots aktualisieren
    await this.updateQuoteTotals(client, quoteId, username);
    
    await client.query('COMMIT');
    
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Fehler beim Löschen der Angebotsposition: ${error.message}`);
  } finally {
    client.release();
  }
};

// Angebot in Rechnung umwandeln
exports.convertToInvoice = async (id, username) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Angebot abrufen
    const quoteResult = await client.query(`
      SELECT * FROM "int".quotes WHERE qid = $1
    `, [id]);
    
    if (quoteResult.rows.length === 0) {
      throw new Error(`Angebot mit ID ${id} nicht gefunden.`);
    }
    
    const quote = quoteResult.rows[0];
    
    // 2. Prüfen, ob das Angebot in einem gültigen Status ist
    if (quote.status !== 'sent' && quote.status !== 'accepted') {
      throw new Error('Nur versendete oder angenommene Angebote können in Rechnungen umgewandelt werden.');
    }
    
    // 3. Angebotspositionen abrufen
    const quoteItemsResult = await client.query(`
      SELECT * FROM "int".quoteitems WHERE qid = $1 ORDER BY position_order
    `, [id]);
    
    const quoteItems = quoteItemsResult.rows;
    
    // 4. Rechnungsnummer generieren
    // Annahme: Es gibt eine Hilfsfunktion generateInvoiceNumber() in einem anderen Service
    const invoiceService = require('./invoiceService');
    const invoiceNumber = await invoiceService.generateInvoiceNumber();
    
    // 5. Notizen mit Angebotsreferenz ergänzen
    const notes = quote.notes 
      ? `${quote.notes}\n\nErstellt aus Angebot ${quote.qnr}` 
      : `Erstellt aus Angebot ${quote.qnr}`;
    
    // 6. Rechnung erstellen
    const invoiceResult = await client.query(`
      INSERT INTO "int".invoices 
      (renr, cust, proj_lnr, issued_date, due_date, total_amount, mwst, mwstprz, status, notes, naid)
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING reid
    `, [
      invoiceNumber,
      quote.cust,
      quote.proj_lnr,
      new Date(),                                        // Aktuelles Datum als Rechnungsdatum
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),  // +14 Tage Zahlungsziel
      quote.total_amount,
      quote.mwst,
      quote.mwstprz,
      'draft',                                          // Neue Rechnung beginnt als Entwurf
      notes,
      username
    ]);
    
    const invoiceId = invoiceResult.rows[0].reid;
    
    // 7. Rechnungspositionen erstellen
    for (const item of quoteItems) {
      await client.query(`
        INSERT INTO "int".invoiceitems 
        (reid, description, quantity, unit_price, tax_rate, amount, position_order, naid)
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        invoiceId,
        item.description,
        item.quantity,
        item.unit_price,
        item.tax_rate,
        item.amount,
        item.position_order,
        username
      ]);
    }
    
    // 8. Angebotsstatus aktualisieren
    if (quote.status === 'sent') {
      await client.query(`
        UPDATE "int".quotes 
        SET status = 'accepted', aeda = NOW(), aeid = $1
        WHERE qid = $2
      `, [username, id]);
    }
    
    await client.query('COMMIT');
    
    // 9. Ergebnis zurückgeben
    return {
      invoiceId,
      invoiceNumber
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// PDF-Daten für Angebot abrufen
exports.getQuotePdfData = async (id) => {
  try {
    // 1. Angebot mit Details abrufen
    const quoteDetail = await this.getQuoteById(id);
    
    if (!quoteDetail) {
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
    `, [quoteDetail.quote.cust]);
    
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
      quote: quoteDetail.quote,
      customer: customer,
      items: quoteDetail.items,
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
      }
    };
  } catch (error) {
    throw new Error(`Fehler beim Abrufen der PDF-Daten: ${error.message}`);
  }
};

// Hilfsmethoden
// Gesamtbetrag und MwSt des Angebots aktualisieren
exports.updateQuoteTotals = async (client, quoteId, username) => {
  try {
    // Fortsetzung von quoteService.js - updateQuoteTotals Methode

    // 1. Netto-Gesamtbetrag der Angebotspositionen berechnen
    const totalsResult = await client.query(`
      SELECT 
        SUM(amount) AS net_total,
        AVG(tax_rate) AS avg_tax_rate
      FROM "int".quoteitems 
      WHERE qid = $1
    `, [quoteId]);
    
    const totals = totalsResult.rows[0];
    
    // 2. MwSt und Gesamtbetrag berechnen
    const netTotal = parseFloat(totals.net_total || 0);
    const taxRate = Math.round(parseFloat(totals.avg_tax_rate || 20));
    const taxAmount = Math.round(netTotal * (taxRate / 100) * 100) / 100;
    const totalAmount = netTotal + taxAmount;
    
    // 3. Angebot aktualisieren
    await client.query(`
      UPDATE "int".quotes 
      SET total_amount = $1, 
          mwst = $2, 
          mwstprz = $3, 
          aeda = NOW(), 
          aeid = $4
      WHERE qid = $5
    `, [
      totalAmount,
      taxAmount,
      taxRate,
      username,
      quoteId
    ]);
  } catch (error) {
    throw error;
  }
};

module.exports = exports;