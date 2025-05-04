module.exports = {
  async up(db) {
    await db.createCollection('servicenotices');
    await db.collection('settings').updateMany({}, {
      $set: { 'tax.cgst': 0, 'tax.sgst': 0 }
    });
  },
  async down(db) {
    await db.collection('servicenotices').drop();
    await db.collection('settings').updateMany({}, {
      $unset: { 'tax.cgst': '', 'tax.sgst': '' }
    });
  }
};
