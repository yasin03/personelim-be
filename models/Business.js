const { db, COLLECTIONS } = require("../src/config/firebase");

class Business {
  constructor(data) {
    this.name = data.name; // İşletme adı
    this.address = data.address; // İşletme adresi
    this.phone = data.phone; // İşletme telefonu
    this.email = data.email; // İşletme email
    this.logoUrl =
      data.logoUrl || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    this.ownerId = data.ownerId; // Firebase Auth UID
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Get businesses collection reference
  static getBusinessesCollection() {
    return db.collection(COLLECTIONS.BUSINESSES || "businesses");
  }

  // Create new business
  static async create(businessData) {
    try {
      const business = new Business({
        ...businessData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const businessRef = await this.getBusinessesCollection().add({
        name: business.name,
        address: business.address,
        phone: business.phone,
        email: business.email,
        logoUrl: business.logoUrl,
        ownerId: business.ownerId,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt,
      });

      return {
        id: businessRef.id,
        ...business,
      };
    } catch (error) {
      throw new Error(`Failed to create business: ${error.message}`);
    }
  }

  // Find business by ID
  static async findById(businessId) {
    try {
      const businessDoc = await this.getBusinessesCollection()
        .doc(businessId)
        .get();

      if (!businessDoc.exists) {
        return null;
      }

      return {
        id: businessDoc.id,
        ...businessDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to find business by ID: ${error.message}`);
    }
  }

  // Find business by owner ID
  static async findByOwnerId(ownerId) {
    try {
      const businessesSnapshot = await this.getBusinessesCollection()
        .where("ownerId", "==", ownerId)
        .get();

      if (businessesSnapshot.empty) {
        return null;
      }

      const businessDoc = businessesSnapshot.docs[0];
      return {
        id: businessDoc.id,
        ...businessDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to find business by owner ID: ${error.message}`);
    }
  }

  // Update business
  static async updateById(businessId, updateData) {
    try {
      const businessDoc = await this.getBusinessesCollection()
        .doc(businessId)
        .get();

      if (!businessDoc.exists) {
        return null;
      }

      const updateFields = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      await this.getBusinessesCollection().doc(businessId).update(updateFields);

      // Return updated business data
      const updatedDoc = await this.getBusinessesCollection()
        .doc(businessId)
        .get();

      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      };
    } catch (error) {
      throw new Error(`Failed to update business: ${error.message}`);
    }
  }

  // Sanitize business data (remove sensitive fields if any)
  static sanitize(business) {
    if (!business) return null;

    return {
      id: business.id,
      name: business.name,
      address: business.address,
      phone: business.phone,
      email: business.email,
      logoUrl: business.logoUrl,
      ownerId: business.ownerId,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    };
  }
}

module.exports = Business;
