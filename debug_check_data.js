import { AccreditationsAPI } from './src/lib/storage.js';

async function checkData() {
  const eventId = 'c97c7235-ceff-4fc6-b5b3-7fa64ec38aeb';
  const accs = await AccreditationsAPI.getByEventId(eventId);
  const target = accs.find(a => a.firstName === 'RAJ KUMAR' && a.lastName === 'Fairbairn');
  
  if (target) {
    console.log('Found Accreditation:', JSON.stringify(target, null, 2));
    console.log('Custom Message:', target.customMessage);
    console.log('Documents Map:', target.documents);
  } else {
    console.log('Target accreditation not found');
  }
}

checkData().catch(console.error);
