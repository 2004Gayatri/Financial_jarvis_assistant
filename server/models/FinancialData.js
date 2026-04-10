const mongoose = require('mongoose');

const financialDataSchema = new mongoose.Schema({
   month: {
      type: Number, // 1-12
      required: true
   },
   date: {
      type: String
   },
   type: {
      type: String // Income / Expense
   },
   category: {
      type: String
   },
   department: {
      type: String
   },
   client: {
      type: String
   },
   project: {
      type: String
   },
   description: {
      type: String
   },
   amount: {
      type: Number
   },
   status: {
      type: String
   }
}, { timestamps: true });

module.exports = mongoose.model("FinancialData", financialDataSchema);
