module.exports = {
    async up(db) {
      // Add custom notices collection
      await db.createCollection('servicenotices');
      // Ensure Settings has CGST/SGST fields
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
  