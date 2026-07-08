const SHEET_NAME = "Proposals";
const PUBLIC_SITE_URL = "https://riteshpati001.github.io/Sorry-and-Love-/";

function doGet(e) {
  const params = e.parameter || {};
  const callback = params.callback || "callback";

  try {
    const action = params.action;

    if (action === "create") {
      return jsonp(callback, createProposal(params));
    }

    if (action === "respond") {
      return jsonp(callback, saveResponse(params));
    }

    if (action === "status") {
      return jsonp(callback, getProposalStatus(params));
    }

    return jsonp(callback, { ok: false, error: "Unknown action." });
  } catch (error) {
    return jsonp(callback, { ok: false, error: error.message });
  }
}

function createProposal(params) {
  const senderEmail = cleanEmail(params.senderEmail);
  if (!senderEmail) {
    throw new Error("Please enter a valid sender email.");
  }

  const id = Utilities.getUuid().replace(/-/g, "").slice(0, 20);
  const now = new Date();
  const link = `${PUBLIC_SITE_URL}?proposal=${encodeURIComponent(id)}`;

  getSheet().appendRow([
    id,
    now,
    cleanText(params.senderName),
    senderEmail,
    cleanText(params.recipientName),
    link,
    "",
    "",
    "",
    "",
  ]);

  return { ok: true, id, link };
}

function saveResponse(params) {
  const id = cleanText(params.id);
  const choice = cleanText(params.choice).toLowerCase();

  if (!id) {
    throw new Error("Proposal ID is missing.");
  }

  if (choice !== "accepted" && choice !== "rejected") {
    throw new Error("Response must be accepted or rejected.");
  }

  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const rowIndex = values.findIndex((row, index) => index > 0 && row[0] === id);

  if (rowIndex === -1) {
    throw new Error("Proposal link was not found.");
  }

  const rowNumber = rowIndex + 1;
  const row = values[rowIndex];
  const senderName = row[2] || "there";
  const senderEmail = row[3];
  const recipientName = row[4] || "Someone special";
  const proposalLink = row[5];
  const answeredAt = new Date();

  sheet.getRange(rowNumber, 7, 1, 4).setValues([[
    choice,
    answeredAt,
    params.userAgent || "",
    "Email pending",
  ]]);

  const accepted = choice === "accepted";
  const subject = accepted ? "Your proposal was accepted" : "Your proposal received a response";
  const resultLine = accepted
    ? `${recipientName} accepted your proposal.`
    : `${recipientName} rejected your proposal.`;

  MailApp.sendEmail({
    to: senderEmail,
    subject,
    htmlBody: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#24121d">
        <h2>${accepted ? "Good news" : "Proposal update"}</h2>
        <p>Hi ${senderName},</p>
        <p><strong>${resultLine}</strong></p>
        <p>Proposal link: <a href="${proposalLink}">${proposalLink}</a></p>
        <p style="color:#6f5865;font-size:13px">Answered at: ${answeredAt}</p>
      </div>
    `,
    body: [
      `Hi ${senderName},`,
      "",
      resultLine,
      "",
      `Proposal link: ${proposalLink}`,
      `Answered at: ${answeredAt}`,
    ].join("\n"),
  });

  sheet.getRange(rowNumber, 10).setValue("Email sent");

  return { ok: true, choice };
}

function getProposalStatus(params) {
  const id = cleanText(params.id);
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const row = values.find((item, index) => index > 0 && item[0] === id);

  if (!row) {
    return { ok: false, error: "Proposal link was not found." };
  }

  return {
    ok: true,
    recipientName: row[4] || "",
    answered: Boolean(row[6]),
    choice: row[6] || "",
  };
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Proposal ID",
      "Created At",
      "Sender Name",
      "Sender Email",
      "Recipient Name",
      "Proposal Link",
      "Response",
      "Responded At",
      "User Agent",
      "Email Status",
    ]);
  }

  return sheet;
}

function jsonp(callback, payload) {
  const safeCallback = String(callback).replace(/[^\w$.]/g, "");
  return ContentService
    .createTextOutput(`${safeCallback}(${JSON.stringify(payload)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function cleanText(value) {
  return String(value || "").trim().slice(0, 200);
}

function cleanEmail(value) {
  const email = cleanText(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
