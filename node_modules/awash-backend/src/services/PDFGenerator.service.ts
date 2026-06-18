// backend/src/services/PDFGenerator.service.ts
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Generates a policy schedule PDF document
 * @param {Object} policyData - The policy data object
 * @returns {Promise<string>} - The path to the generated PDF file
 */
export async function generatePolicySchedule(policyData: any): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', 'policies');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log(`Created directory: ${uploadsDir}`);
      }
      
      // Generate unique filename (remove any slashes from policy number)
      const safePolicyNumber = (policyData.policyNumber || 'policy').replace(/[\/\\]/g, '_');
      const timestamp = Date.now();
      const fileName = `policy_${safePolicyNumber}_${timestamp}.pdf`;
      const filePath = path.join(uploadsDir, fileName);
      
      console.log(`Generating PDF at: ${filePath}`);
      
      // Create a new PDF document
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Policy Schedule - ${policyData.policyNumber}`,
          Author: 'Awash Insurance',
          Subject: 'Insurance Policy Document',
          Keywords: 'insurance, policy, schedule'
        }
      });
      
      // Create write stream
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // ==================== HEADER SECTION ====================
      
      // Company Logo and Header
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#1A3E6F')
         .text('AWASH INSURANCE', { align: 'center' });
      
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Policy Schedule', { align: 'center' });
      
      doc.moveDown(0.5);
      
      // Divider line
      doc.strokeColor('#1A3E6F')
         .lineWidth(2)
         .moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke();
      
      doc.moveDown(1);
      
      // ==================== POLICY INFORMATION ====================
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1A3E6F')
         .text('POLICY INFORMATION', { underline: true });
      
      doc.moveDown(0.5);
      
      // Policy details table
      const startY = doc.y;
      const leftColX = 50;
      const rightColX = 300;
      const rowHeight = 25;
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('Policy Number:', leftColX, startY);
      doc.font('Helvetica')
         .fillColor('#666666')
         .text(policyData.policyNumber || 'N/A', rightColX, startY);
      
      doc.font('Helvetica-Bold')
         .text('Product Type:', leftColX, startY + rowHeight);
      doc.font('Helvetica')
         .text(policyData.productType || 'N/A', rightColX, startY + rowHeight);
      
      doc.font('Helvetica-Bold')
         .text('Product Name:', leftColX, startY + rowHeight * 2);
      doc.font('Helvetica')
         .text(policyData.productName || 'N/A', rightColX, startY + rowHeight * 2);
      
      doc.font('Helvetica-Bold')
         .text('Coverage Amount:', leftColX, startY + rowHeight * 3);
      doc.font('Helvetica')
         .text(`ETB ${(policyData.coverageAmount || 0).toLocaleString()}`, rightColX, startY + rowHeight * 3);
      
      doc.font('Helvetica-Bold')
         .text('Coverage Tier:', leftColX, startY + rowHeight * 4);
      doc.font('Helvetica')
         .text(policyData.coverageTier || 'Standard', rightColX, startY + rowHeight * 4);
      
      doc.moveDown(2);
      
      // ==================== PREMIUM BREAKDOWN ====================
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1A3E6F')
         .text('PREMIUM BREAKDOWN', { underline: true });
      
      doc.moveDown(0.5);
      
      const premiumStartY = doc.y;
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('Base Premium:', leftColX, premiumStartY);
      doc.font('Helvetica')
         .fillColor('#666666')
         .text(`ETB ${(policyData.premium || 0).toLocaleString()}`, rightColX, premiumStartY);
      
      if (policyData.perilPremium && policyData.perilPremium > 0) {
        doc.font('Helvetica-Bold')
           .text('Perils Premium:', leftColX, premiumStartY + rowHeight);
        doc.font('Helvetica')
           .text(`ETB ${(policyData.perilPremium || 0).toLocaleString()}`, rightColX, premiumStartY + rowHeight);
      }
      
      if (policyData.riderPremium && policyData.riderPremium > 0) {
        doc.font('Helvetica-Bold')
           .text('Riders Premium:', leftColX, premiumStartY + rowHeight * 2);
        doc.font('Helvetica')
           .text(`ETB ${(policyData.riderPremium || 0).toLocaleString()}`, rightColX, premiumStartY + rowHeight * 2);
      }
      
      doc.font('Helvetica-Bold')
         .text('Total Premium:', leftColX, premiumStartY + rowHeight * 3);
      doc.font('Helvetica-Bold')
         .fillColor('#1A3E6F')
         .text(`ETB ${(policyData.totalPremium || policyData.premium || 0).toLocaleString()}`, rightColX, premiumStartY + rowHeight * 3);
      
      doc.font('Helvetica')
         .fillColor('#666666')
         .text(`Premium Frequency: ${policyData.premiumFrequency || 'ANNUALLY'}`, leftColX, premiumStartY + rowHeight * 4);
      
      doc.moveDown(2);
      
      // ==================== POLICY DATES ====================
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1A3E6F')
         .text('POLICY DATES', { underline: true });
      
      doc.moveDown(0.5);
      
      const dateStartY = doc.y;
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('Effective Date:', leftColX, dateStartY);
      doc.font('Helvetica')
         .fillColor('#666666')
         .text(policyData.effectiveDate ? new Date(policyData.effectiveDate).toLocaleDateString() : 'N/A', rightColX, dateStartY);
      
      doc.font('Helvetica-Bold')
         .text('Expiration Date:', leftColX, dateStartY + rowHeight);
      doc.font('Helvetica')
         .text(policyData.expirationDate ? new Date(policyData.expirationDate).toLocaleDateString() : 'N/A', rightColX, dateStartY + rowHeight);
      
      doc.moveDown(2);
      
      // ==================== CUSTOMER INFORMATION ====================
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1A3E6F')
         .text('CUSTOMER INFORMATION', { underline: true });
      
      doc.moveDown(0.5);
      
      const customerStartY = doc.y;
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('Name:', leftColX, customerStartY);
      doc.font('Helvetica')
         .fillColor('#666666')
         .text(policyData.customerName || 'N/A', rightColX, customerStartY);
      
      doc.font('Helvetica-Bold')
         .text('Email:', leftColX, customerStartY + rowHeight);
      doc.font('Helvetica')
         .text(policyData.customerEmail || 'N/A', rightColX, customerStartY + rowHeight);
      
      doc.font('Helvetica-Bold')
         .text('Phone:', leftColX, customerStartY + rowHeight * 2);
      doc.font('Helvetica')
         .text(policyData.customerPhone || 'N/A', rightColX, customerStartY + rowHeight * 2);
      
      doc.font('Helvetica-Bold')
         .text('Address:', leftColX, customerStartY + rowHeight * 3);
      doc.font('Helvetica')
         .text(policyData.customerAddress || 'N/A', rightColX, customerStartY + rowHeight * 3);
      
      doc.moveDown(2);
      
      // ==================== VEHICLES (if applicable) ====================
      
      if (policyData.vehicles && policyData.vehicles.length > 0) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#1A3E6F')
           .text('VEHICLES COVERED', { underline: true });
        
        doc.moveDown(0.5);
        
        let vehicleY = doc.y;
        
        for (let i = 0; i < policyData.vehicles.length; i++) {
          const vehicle = policyData.vehicles[i];
          
          if (vehicleY > 700) {
            doc.addPage();
            vehicleY = 50;
          }
          
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor('#333333')
             .text(`Vehicle ${i + 1}: ${vehicle.make || ''} ${vehicle.model || ''} (${vehicle.yearOfMake || vehicle.year || 'N/A'})`, leftColX, vehicleY);
          
          doc.font('Helvetica')
             .fillColor('#666666')
             .text(`Registration: ${vehicle.plateNumber || vehicle.registrationNumber || 'N/A'}`, rightColX, vehicleY);
          
          vehicleY += rowHeight;
          
          doc.font('Helvetica')
             .text(`Engine Number: ${vehicle.engineNumber || 'N/A'}`, leftColX, vehicleY);
          doc.font('Helvetica')
             .text(`Chassis Number: ${vehicle.chassisNumber || 'N/A'}`, rightColX, vehicleY);
          
          vehicleY += rowHeight;
          
          doc.font('Helvetica')
             .text(`Vehicle Type: ${vehicle.vehicleType || 'N/A'}`, leftColX, vehicleY);
          doc.font('Helvetica')
             .text(`Vehicle Value: ETB ${(vehicle.vehicleValue || 0).toLocaleString()}`, rightColX, vehicleY);
          
          vehicleY += rowHeight + 5;
        }
        
        doc.moveDown(1);
      }
      
      // ==================== SELECTED PERILS ====================
      
      if (policyData.selectedPerils && policyData.selectedPerils.length > 0) {
        if (doc.y > 700) {
          doc.addPage();
        }
        
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#1A3E6F')
           .text('COVERED PERILS', { underline: true });
        
        doc.moveDown(0.5);
        
        let perilY = doc.y;
        
        for (const peril of policyData.selectedPerils) {
          if (perilY > 750) {
            doc.addPage();
            perilY = 50;
          }
          
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor('#333333')
             .text(`• ${peril.perilName || 'Unknown'}`, leftColX, perilY);
          
          doc.font('Helvetica')
             .fillColor('#666666')
             .text(`Premium: ETB ${(peril.premium || 0).toLocaleString()}`, rightColX, perilY);
          
          perilY += rowHeight;
          
          if (peril.description) {
            doc.font('Helvetica')
               .fillColor('#666666')
               .text(peril.description, leftColX, perilY, { width: 500 });
            perilY += rowHeight;
          }
          
          perilY += 5;
        }
        
        doc.moveDown(1);
      }
      
      // ==================== SELECTED RIDERS ====================
      
      if (policyData.selectedRiders && policyData.selectedRiders.length > 0) {
        if (doc.y > 700) {
          doc.addPage();
        }
        
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#1A3E6F')
           .text('OPTIONAL RIDERS', { underline: true });
        
        doc.moveDown(0.5);
        
        let riderY = doc.y;
        
        for (const rider of policyData.selectedRiders) {
          if (riderY > 750) {
            doc.addPage();
            riderY = 50;
          }
          
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor('#333333')
             .text(`• ${rider.riderName || 'Unknown'}`, leftColX, riderY);
          
          doc.font('Helvetica')
             .fillColor('#666666')
             .text(`Premium: ETB ${(rider.premium || 0).toLocaleString()}`, rightColX, riderY);
          
          riderY += rowHeight;
          
          if (rider.description) {
            doc.font('Helvetica')
               .fillColor('#666666')
               .text(rider.description, leftColX, riderY, { width: 500 });
            riderY += rowHeight;
          }
          
          if (rider.maxLimit) {
            doc.font('Helvetica')
               .fillColor('#666666')
               .text(`Max Limit: ETB ${rider.maxLimit.toLocaleString()}`, leftColX, riderY);
            riderY += rowHeight;
          }
          
          riderY += 5;
        }
        
        doc.moveDown(1);
      }
      
      // ==================== TERMS AND CONDITIONS ====================
      
      if (doc.y > 650) {
        doc.addPage();
      }
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1A3E6F')
         .text('TERMS AND CONDITIONS', { underline: true });
      
      doc.moveDown(0.5);
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#666666')
         .text('This policy is issued based on the information provided by the policyholder.', 
               { align: 'left', width: 500 });
      
      doc.moveDown(0.3);
      doc.text('The policyholder must notify the insurer of any material changes to the risk within 14 days.', 
               { align: 'left', width: 500 });
      
      doc.moveDown(0.3);
      doc.text('Claims must be reported within 30 days of the incident.', 
               { align: 'left', width: 500 });
      
      doc.moveDown(0.3);
      doc.text('This document is a legally binding contract between the policyholder and Awash Insurance.', 
               { align: 'left', width: 500 });
      
      doc.moveDown(1);
      
      // ==================== SIGNATURES ====================
      
      const signatureY = doc.y;
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#333333')
         .text('Authorized Signature:', leftColX, signatureY);
      
      doc.moveDown(0.5);
      doc.font('Helvetica')
         .text('_________________________', leftColX, doc.y);
      doc.text('Authorized Representative', leftColX, doc.y + 15);
      
      doc.font('Helvetica-Bold')
         .text('Policyholder Signature:', rightColX, signatureY);
      doc.moveDown(0.5);
      doc.font('Helvetica')
         .text('_________________________', rightColX, doc.y);
      doc.text('Policyholder', rightColX, doc.y + 15);
      
      doc.moveDown(2);
      
      // ==================== FOOTER - REMOVED THE PROBLEMATIC CODE ====================
      // Add a simple footer on the last page
      const finalY = doc.y;
      doc.fontSize(8)
         .fillColor('#999999')
         .text(
           `Policy Schedule - ${policyData.policyNumber} | Generated: ${new Date().toLocaleDateString()}`,
           50,
           doc.page.height - 30,
           { align: 'center', width: 500 }
         );
      
      // Finalize PDF
      doc.end();
      
      stream.on('finish', () => {
        console.log(`PDF generated successfully: ${filePath}`);
        resolve(filePath);
      });
      
      stream.on('error', (error) => {
        console.error('Stream error:', error);
        reject(error);
      });
      
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
}

export default { generatePolicySchedule };