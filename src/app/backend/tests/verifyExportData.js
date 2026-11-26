const { calculateReportAnalytics, generateReportBuilderExport } = require('../services/institutionalReportBuilderService');
const origLog = console.log;
console.log = (...args) => {
  if (typeof args[0] === 'string' && (args[0].includes('Executing') || args[0].includes('SELECT') || args[0].includes('INSERT'))) return;
  if (typeof args[0] === 'object' && args[0] !== null && args[0].tableNames) return;
  origLog(...args);
};
const jszip = require('jszip');

async function testExportData() {
  console.log('Calculating report analytics from live database...');
  const reportData = await calculateReportAnalytics({
    reportType: 'analytical',
    scopeConfig: {
      campuses: ['Bengaluru Kengeri Campus'],
      schools: ['School of Engineering and Technology'],
      departments: ['All'],
      academicYears: ['2023-24', '2024-25', '2025-26', '2026-27']
    },
    contentConfig: {
      sections: {
        'citation-impact': true,
        'comparative-analytics': true,
        'departmental-matrix': true,
        'executive-summary': true
      }
    }
  });

  console.log('\n--- VERIFYING DEPARTMENTAL COMPARISONS IN REPORT DATA ---');
  console.log('Departments found:', reportData.departmentComparisons.length);
  reportData.departmentComparisons.forEach(d => {
    console.log(`- ${d.shortName} (${d.department}): Faculty=${d.facultyCount}, Ph.D.=${d.phdCount} (${d.phdPercentage}%), Pubs=${d.publicationsCount}, Citations=${d.citationsCount}, Grants=₹${d.sponsoredFundingLakhs}L, Patents=${d.patentsCount}, Consultancy=₹${d.consultancyLakhs}L`);
  });

  console.log('\n--- VERIFYING ACADEMIC YEAR COMPARISONS IN REPORT DATA ---');
  console.log('AY rows found:', reportData.ayComparisonRows.length);
  reportData.ayComparisonRows.forEach(r => {
    console.log(`- ${r.displayAy || r.academicYear}: Faculty=${r.facultyCount}, Pubs=${r.publicationsCount}, Q1=${r.q1PubCount}, Citations=${r.citationsCount}, Grants=₹${r.sponsoredAmountLakhs}L, Patents=${r.patentsCount}`);
  });

  console.log('\n--- VERIFYING WORD (DOCX) EXPORT BUFFER ---');
  const docxExport = await generateReportBuilderExport({
    reportType: 'analytical',
    outputFormat: 'docx',
    reportData,
    config: { reportType: 'analytical', outputFormat: 'docx' }
  });
  console.log('Generated DOCX buffer size:', docxExport.buffer.length, 'bytes');

  // Unzip docx and inspect word/document.xml for key department data
  const docxZip = await jszip.loadAsync(docxExport.buffer);
  const docXml = await docxZip.file('word/document.xml').async('string');

  console.log('docXml length:', docXml.length);
  console.log('departmentComparisons in reportData:', JSON.stringify(reportData.departmentComparisons.map(d => ({
    name: d.shortName,
    facultyCount: d.facultyCount,
    publicationsCount: d.publicationsCount,
    citationsCount: d.citationsCount
  })), null, 2));

  const checkDocxPatterns = ['1373', '830', '577', 'ECE', 'EEE', 'CIVIL', 'ADSE', 'AY 2024–25', 'AY 2023–24'];
  checkDocxPatterns.forEach(pattern => {
    const found = docXml.includes(pattern);
    console.log(`  DOCX contains "${pattern}":`, found ? 'YES' : 'NO');
    if (!found) throw new Error(`DOCX missing expected pattern: ${pattern}`);
  });

  console.log('\n--- VERIFYING POWERPOINT (PPTX) EXPORT BUFFER ---');
  const pptxExport = await generateReportBuilderExport({
    reportType: 'analytical',
    outputFormat: 'pptx',
    reportData,
    config: { reportType: 'analytical', outputFormat: 'pptx' }
  });
  console.log('Generated PPTX buffer size:', pptxExport.buffer.length, 'bytes');

  // Unzip pptx and search slide XMLs
  const pptxZip = await jszip.loadAsync(pptxExport.buffer);
  let pptxAllText = '';
  for (const filename of Object.keys(pptxZip.files)) {
    if (filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')) {
      const slideXml = await pptxZip.file(filename).async('string');
      pptxAllText += ' ' + slideXml;
    }
  }

  const checkPptxPatterns = ['1373', '830', '577', 'ECE', 'EEE', 'CIVIL', 'ADSE', 'AY 2024–25', 'AY 2023–24'];
  checkPptxPatterns.forEach(pattern => {
    const found = pptxAllText.includes(pattern);
    console.log(`  PPTX contains "${pattern}":`, found ? 'YES' : 'NO');
    if (!found) throw new Error(`PPTX missing expected pattern: ${pattern}`);
  });

  console.log('\n>>> ALL WORD AND PPTX VERIFICATIONS PASSED WITH REAL DB VALUES! <<<');
  process.exit(0);
}

testExportData().catch(err => {
  console.error('Error during test export:', err);
  process.exit(1);
});
