# FlashmyDeal Google Apps Script Serverless Backend

Use this guide to deploy your own **100% free, serverless API** that connects FlashmyDeal directly to your Google Sheets (acting as your database) and Google Drive (for image hosting and custom verification emails).

This guide and script has been pre-configured with **your custom Google Drive parent folder** and is ready to attach directly to your spreadsheet!

---

## 🚀 Deployment Instructions (Step-by-Step)

### Step 1: Open Your Existing Google Sheet
- Open your database spreadsheet:
  👉 [FlashmyDeal Database Sheet](https://docs.google.com/spreadsheets/d/1lEw-w4nTWlRptyXJkPOHBW3O_n8oBgtGkf6zTQOMnIk/edit?usp=sharing)
- *Note: The updated script will automatically handle the new `password` and `otpCode` columns inside the `users` tab.*

### Step 2: Attach the Apps Script
1. Inside your Google Sheet, click on the **Extensions** menu at the top.
2. Select **Apps Script**.
3. Delete any default code in the editor (the empty `myFunction` block).
4. Copy the entire script in the **Code.gs** section below and paste it into the editor.
5. Click the **Save** disk icon (or press `Ctrl+S` / `Cmd+S`).

### Step 3: Deploy as a Web App
1. Click the **Deploy** button in the top-right corner of the Apps Script page.
2. Select **New deployment**.
3. Click the gear icon next to "Select type" and choose **Web app**.
4. Configure the following deployment fields:
   - **Description**: `FlashmyDeal Backend API`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone` *(This allows your FlashmyDeal website to talk securely to your API)*
5. Click **Deploy**.
6. Google will prompt you to authorize permissions. Click **Authorize access**, log in with your Google account, click **Advanced** at the bottom, select **Go to Untitled project (unsafe)**, and hit **Allow**.
7. Once deployed, copy the **Web App URL** from the success screen (it ends with `/exec`).

### Step 4: No Configuration Needed on Frontend
- The website is preconfigured to use your custom Web App URL:
  `https://script.google.com/macros/s/AKfycbwa8W5RrBnTWRkNEbl3thkO_KsmXKi1OMbWcsaNb1glVe2w8TSV-k63l_1u5Ce9UK5GtA/exec`
- No further work is needed on your end!

---

## 📝 Code.gs (Copy & Paste this)

```javascript
// Google Apps Script for FlashmyDeal
// Configured to automatically upload images directly into your target Google Drive Folder!

// YOUR CONFIGURED GOOGLE DRIVE PARENT FOLDER ID:
var PARENT_FOLDER_ID = "118S9k1d99NxpC59pCoiJQjGCibk7x_V_";

function doGet(e) {
  try {
    var action = e.parameter.action;
    
    // Initialize Sheets
    var sheets = initSheets();
    
    if (action === 'getUser') {
      var uid = e.parameter.uid;
      var user = getUserByUid(sheets.usersSheet, uid);
      return jsonResponse(user ? user : { error: 'User not found' });
    }
    
    // Default: Get all listings
    var listings = getListings(sheets.listingsSheet);
    return jsonResponse(listings);
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    
    // Initialize Sheets
    var sheets = initSheets();
    
    if (action === 'createListing') {
      var listing = createListingInDriveAndSheet(sheets.listingsSheet, postData);
      return jsonResponse(listing);
    }
    
    if (action === 'updateStatus') {
      var success = updateListingStatus(sheets.listingsSheet, postData.id, postData.status);
      return jsonResponse({ success: success });
    }
    
    if (action === 'deleteListing') {
      var success = deleteListingRow(sheets.listingsSheet, postData.id);
      return jsonResponse({ success: success });
    }
    
    if (action === 'saveUser') {
      var success = saveUserProfile(sheets.usersSheet, postData.profile);
      return jsonResponse({ success: success });
    }
    
    if (action === 'deleteUser') {
      var success = deleteUserRow(sheets.usersSheet, postData.uid);
      return jsonResponse({ success: success });
    }
    
    if (action === 'sendVerificationEmail') {
      var email = postData.email;
      var name = postData.name;
      var code = postData.code;
      
      var subject = "Verify your FlashmyDeal Seller Account";
      var body = "Hi " + name + ",\n\n" +
                 "Your FlashmyDeal verification code is: " + code + "\n\n" +
                 "Please enter this code in the website verification box to verify your account and start posting deals.\n\n" +
                 "Best regards,\nFlashmyDeal Team";
                 
      var htmlBody = "<div style='font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #060911; color: #ffffff;'>" +
                     "<h2 style='color: #00f2fe; text-align: center; margin-bottom: 24px;'>FlashmyDeal Verification</h2>" +
                     "<p style='font-size: 14px; color: #94a3b8; line-height: 1.5;'>Hi <strong>" + name + "</strong>,</p>" +
                     "<p style='font-size: 14px; color: #94a3b8; line-height: 1.5;'>Thank you for joining Sri Lanka's premium flash marketplace! To secure your account and start posting lightning-fast deals, please verify your email using the verification code below:</p>" +
                     "<div style='text-align: center; margin: 30px 0;'>" +
                     "<span style='font-size: 32px; font-weight: 800; letter-spacing: 5px; color: #ffffff; background-color: #111827; padding: 12px 24px; border-radius: 8px; border: 1px solid #00f2fe; display: inline-block;'>" + code + "</span>" +
                     "</div>" +
                     "<p style='font-size: 12px; color: #64748b; line-height: 1.5;'>If you did not request this verification, please ignore this email.</p>" +
                     "<hr style='border: 0; border-top: 1px solid #111827; margin: 24px 0;'>" +
                     "<p style='font-size: 11px; text-align: center; color: #475569;'>Sent securely from your FlashmyDeal personal portal</p>" +
                     "</div>";

      try {
        GmailApp.sendEmail(email, subject, body, {
          name: "FlashmyDeal Marketplace",
          htmlBody: htmlBody
        });
        return jsonResponse({ success: true });
      } catch (e) {
        // Fallback to MailApp
        try {
          MailApp.sendEmail(email, subject, body, {
            name: "FlashmyDeal Marketplace",
            htmlBody: htmlBody
          });
          return jsonResponse({ success: true });
        } catch (mailErr) {
          return jsonResponse({ error: "Failed to send verification email: " + mailErr.toString() });
        }
      }
    }
    
    return jsonResponse({ error: 'Invalid action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function initSheets() {
  var doc = null;
  try {
    doc = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}
  
  if (!doc) {
    // Standalone fallback: Open using your specific Spreadsheet ID
    doc = SpreadsheetApp.openById("1lEw-w4nTWlRptyXJkPOHBW3O_n8oBgtGkf6zTQOMnIk");
  }
  
  var listingsSheet = doc.getSheetByName("listings");
  if (!listingsSheet) {
    listingsSheet = doc.insertSheet("listings");
    listingsSheet.appendRow([
      "id", "title", "price", "originalPrice", "currency", 
      "category", "condition", "location", "description", 
      "tags", "timestamp", "sellerId", "sellerName", "status", "images", "phone"
    ]);
  }
  
  var usersSheet = doc.getSheetByName("users");
  if (!usersSheet) {
    usersSheet = doc.insertSheet("users");
    usersSheet.appendRow([
      "uid", "email", "displayName", "joinedDate", "verifiedStatus", "phone", "listingRefs", "password", "otpCode"
    ]);
  } else {
    // Add missing password and otpCode headers to existing sheets dynamically
    var data = usersSheet.getDataRange().getValues();
    var headers = data[0] || [];
    if (headers.indexOf("password") === -1) {
      usersSheet.getRange(1, headers.length + 1).setValue("password");
    }
    headers = usersSheet.getDataRange().getValues()[0];
    if (headers.indexOf("otpCode") === -1) {
      usersSheet.getRange(1, headers.length + 1).setValue("otpCode");
    }
  }
  
  return { listingsSheet: listingsSheet, usersSheet: usersSheet };
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getUserByUid(sheet, uid) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;
  
  var searchId = String(uid).trim();
  for (var i = 1; i < data.length; i++) {
    var cellValue = String(data[i][0]).trim();
    if (cellValue === searchId) {
      return {
        uid: data[i][0],
        email: data[i][1],
        displayName: data[i][2],
        joinedDate: data[i][3],
        verifiedStatus: String(data[i][4]) === 'true',
        phone: data[i][5],
        listingRefs: data[i][6] ? JSON.parse(data[i][6]) : [],
        password: data[i][7] || "",
        otpCode: data[i][8] || ""
      };
    }
  }
  return null;
}

function saveUserProfile(sheet, profile) {
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  var searchId = String(profile.uid).trim();
  
  for (var i = 1; i < data.length; i++) {
    var cellValue = String(data[i][0]).trim();
    if (cellValue === searchId) {
      rowIndex = i + 1; // 1-indexed and skipping header
      break;
    }
  }
  
  var rowData = [
    profile.uid,
    profile.email,
    profile.displayName,
    profile.joinedDate,
    profile.verifiedStatus,
    profile.phone || "",
    profile.listingRefs ? JSON.stringify(profile.listingRefs) : "[]",
    profile.password || "",
    profile.otpCode || ""
  ];
  
  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return true;
}

function deleteUserRow(sheet, uid) {
  var data = sheet.getDataRange().getValues();
  var searchId = String(uid).trim();
  for (var i = 1; i < data.length; i++) {
    var cellValue = String(data[i][0]).trim();
    if (cellValue === searchId) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function getListings(sheet) {
  var data = sheet.getDataRange().getValues();
  var listings = [];
  if (data.length <= 1) return listings;
  
  for (var i = 1; i < data.length; i++) {
    listings.push({
      id: data[i][0],
      title: data[i][1],
      price: Number(data[i][2]),
      originalPrice: data[i][3] ? Number(data[i][3]) : undefined,
      currency: data[i][4],
      category: data[i][5],
      condition: data[i][6],
      location: data[i][7],
      description: data[i][8],
      tags: data[i][9] ? JSON.parse(data[i][9]) : [],
      timestamp: Number(data[i][10]),
      sellerId: data[i][11],
      sellerName: data[i][12],
      status: data[i][13],
      images: data[i][14] ? JSON.parse(data[i][14]) : [],
      phone: String(data[i][15])
    });
  }
  
  // Sort descending by timestamp
  listings.sort(function(a, b) {
    return b.timestamp - a.timestamp;
  });
  
  return listings;
}

function getOrCreateParentFolder() {
  if (typeof PARENT_FOLDER_ID !== 'undefined' && PARENT_FOLDER_ID && PARENT_FOLDER_ID !== "YOUR_FOLDER_ID_HERE" && PARENT_FOLDER_ID.trim() !== "") {
    try {
      return DriveApp.getFolderById(PARENT_FOLDER_ID);
    } catch (e) {
      Logger.log("Custom PARENT_FOLDER_ID not found or inaccessible, trying fallback: " + e.toString());
    }
  }
  
  var root = DriveApp.getRootFolder();
  var folders = root.getFoldersByName("FlashmyDeal_Uploads");
  if (folders.hasNext()) {
    return folders.next();
  } else {
    try {
      var newParent = root.createFolder("FlashmyDeal_Uploads");
      newParent.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return newParent;
    } catch (e) {
      Logger.log("Failed to create FlashmyDeal_Uploads folder: " + e.toString());
      return root;
    }
  }
}

function createListingInDriveAndSheet(sheet, payload) {
  var folderName = "FlashmyDeal_" + payload.title.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Date.now();
  var listingFolder = null;
  
  try {
    var parentFolder = getOrCreateParentFolder();
    listingFolder = parentFolder.createFolder(folderName);
    listingFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log("Failed to create subfolder under your specified parent, fallback to root: " + e.toString());
    try {
      listingFolder = DriveApp.getRootFolder().createFolder(folderName);
      listingFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (rootErr) {
      Logger.log("Absolute root fallback failed: " + rootErr.toString());
    }
  }
  
  var imageUrls = [];
  var imagesPayload = payload.images || [];
  var imageErrors = [];
  
  for (var i = 0; i < imagesPayload.length; i++) {
    try {
      var img = imagesPayload[i];
      var base64Data = img.data;
      if (!base64Data) {
        imageErrors.push("Image " + i + " was empty");
        continue;
      }
      
      if (base64Data.indexOf(",") > -1) {
        base64Data = base64Data.split(",")[1];
      }
      
      base64Data = base64Data.replace(/-/g, "+").replace(/_/g, "/");
      base64Data = base64Data.replace(/[^A-Za-z0-9\+\/=]/g, "");
      
      var padNeeded = base64Data.length % 4;
      if (padNeeded > 0) {
        base64Data += "====".slice(padNeeded);
      }
      
      var decoded;
      try {
        decoded = Utilities.base64Decode(base64Data);
      } catch (decErr) {
        decoded = Utilities.base64DecodeWebSafe(base64Data);
      }
      
      var safeName = (img.name || "img_" + (i + 1) + ".jpg").replace(/[^a-zA-Z0-9\._\-]/g, "_");
      var blob = Utilities.newBlob(decoded, img.type || "image/jpeg", safeName);
      
      var file;
      if (listingFolder) {
        file = listingFolder.createFile(blob);
      } else {
        file = DriveApp.createFile(blob);
      }
      
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      var fileId = file.getId();
      var directUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1200";
      imageUrls.push(directUrl);
    } catch (imgErr) {
      imageErrors.push("Image " + i + " error: " + imgErr.toString());
      Logger.log("Failed to process image " + i + ": " + imgErr.toString());
    }
  }
  
  var listingId = "listing_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  var timestamp = Date.now();
  
  var rowData = [
    listingId,
    payload.title,
    Number(payload.price),
    payload.originalPrice ? Number(payload.originalPrice) : "",
    payload.currency || "LKR",
    payload.category,
    payload.condition,
    payload.location,
    payload.description,
    JSON.stringify(payload.tags || []),
    timestamp,
    payload.sellerId,
    payload.sellerName,
    "active",
    JSON.stringify(imageUrls),
    payload.phone || ""
  ];
  
  sheet.appendRow(rowData);
  
  return {
    id: listingId,
    title: payload.title,
    price: Number(payload.price),
    originalPrice: payload.originalPrice ? Number(payload.originalPrice) : undefined,
    currency: payload.currency || "LKR",
    category: payload.category,
    condition: payload.condition,
    location: payload.location,
    description: payload.description,
    tags: payload.tags || [],
    timestamp: timestamp,
    sellerId: payload.sellerId,
    sellerName: payload.sellerName,
    status: "active",
    images: imageUrls,
    phone: payload.phone || "",
    imageErrors: imageErrors.length > 0 ? imageErrors : null
  };
}

function updateListingStatus(sheet, listingId, status) {
  var data = sheet.getDataRange().getValues();
  var searchId = String(listingId).trim();
  for (var i = 1; i < data.length; i++) {
    var cellValue = String(data[i][0]).trim();
    if (cellValue === searchId) {
      sheet.getRange(i + 1, 14).setValue(status);
      return true;
    }
  }
  return false;
}

function deleteListingRow(sheet, listingId) {
  var data = sheet.getDataRange().getValues();
  var searchId = String(listingId).trim();
  for (var i = 1; i < data.length; i++) {
    var cellValue = String(data[i][0]).trim();
    if (cellValue === searchId) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}
```
