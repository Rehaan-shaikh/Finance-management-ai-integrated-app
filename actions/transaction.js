"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";

const serializeAmount = (obj) => ({
  ...obj,
  amount: obj.amount.toNumber(),
});


// Helper function to calculate next recurring date
function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);

  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
}



export async function createTransaction(formData) {
  try {

    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const type = formData.get("type");
    const amount = parseFloat(formData.get("amount"));
    const accountId = formData.get("accountId");
    const category = formData.get("category");
    const date = new Date(formData.get("date"));
    const description = formData.get("description") || "";
    const isRecurring =
      formData.get("isRecurring") === "true" || formData.get("isRecurring") === "on";
    const recurringInterval = formData.get("recurringInterval") || null;

    // Server-side validation
    const errors = {};
    if (!type) errors.type = "Type is required.";
    if (isNaN(amount) || amount <= 0) errors.amount = "Amount must be a positive number.";
    if (!accountId) errors.accountId = "Account is required.";
    if (!category) errors.category = "Category is required.";
    if (!formData.get("date")) errors.date = "Date is required.";
    if (isRecurring && !recurringInterval) {
      errors.recurringInterval = "Recurring interval is required.";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) throw new Error("User not found");

    const account = await db.account.findUnique({
      where: { id: accountId, userId: user.id },
    });
    if (!account) throw new Error("Account not found");

    const balanceChange = type === "EXPENSE" ? -amount : amount;
    const newBalance = account.balance.toNumber() + balanceChange;

    // $transaction ensures atomicity; rollback if any fails
    const transaction = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          type,
          amount,
          accountId,
          category,
          date,
          description,
          isRecurring,
          recurringInterval,
          userId: user.id,
          nextRecurringDate:
            isRecurring && recurringInterval
              ? calculateNextRecurringDate(date, recurringInterval)
              : null,
        },
      });

      await tx.account.update({
        where: { id: accountId },
        data: { balance: newBalance },
      });

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

return {
  success: true,
  transaction: {
    id: transaction.id,
    accountId: transaction.accountId,
  },
  data: serializeAmount(transaction),
};
  } catch (err) {
    return { success: false, message: err.message };
  }
}





export async function updateTransaction(id, formInput) {
  console.log("Updating transaction with ID:", id);
  console.log("Form input:", formInput);

  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user) throw new Error("User not found");

    // 💡 Handle both FormData and plain object
    let data;
    if (formInput instanceof FormData) {
      data = Object.fromEntries(formInput.entries());
    } else {
      data = formInput;
    }

    // 💡 Normalize values
    data.amount = parseFloat(data.amount);
    data.date = new Date(data.date); // 🔥 Ensure date is Date object
    data.isRecurring =
      data.isRecurring === "on" || data.isRecurring === true || data.isRecurring === "true";

    if (!data.isRecurring) {
      data.recurringInterval = null;
    }

    // 🔍 Server-side validation
    const errors = {};
    if (!data.amount || isNaN(data.amount) || data.amount <= 0)
      errors.amount = "Amount is required and must be greater than 0";
    if (!data.accountId) errors.accountId = "Account is required";
    if (!data.type) errors.type = "Type is required";
    if (!data.category) errors.category = "Category is required.";
    if (!data.date) errors.date = "Date is required";
    if (data.isRecurring && !data.recurringInterval)
      errors.recurringInterval = "Recurring interval is required";

    if (Object.keys(errors).length > 0) {
      console.log("Validation errors:", errors);
      return { success: false, errors };
    }

    // Get original transaction to calculate balance change
    const originalTransaction = await db.transaction.findUnique({
      where: {
        id,
        userId: user.id,
      },
      include: {
        account: true,
      },
    });

    if (!originalTransaction) throw new Error("Transaction not found");

    const oldChange =
      originalTransaction.type === "EXPENSE"
        ? -originalTransaction.amount.toNumber()
        : originalTransaction.amount.toNumber();

    const newChange = data.type === "EXPENSE" ? -data.amount : data.amount;

    const netChange = newChange - oldChange;

    // 💥 Log before DB update
    console.log("Updating DB with data:", {
      ...data,
      nextRecurringDate:
        data.isRecurring && data.recurringInterval
          ? calculateNextRecurringDate(data.date, data.recurringInterval)
          : null,
    });

    const transaction = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: {
          id,
          userId: user.id,
        },
        data: {
          ...data,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      // ✅ Use net balance difference directly
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: netChange,
          },
        },
      });

      return updated;
    });

    console.log("Updated transaction:", transaction);

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    console.error("Update failed:", error);
    return { success: false, errors: { message: error.message } };
  }
}
















//first install @google/generative-ai package
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)  //instance
// Function to scan a receipt image and extract relevant information
export async function scanReceipt(file) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });//this model is free to use

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    // We convert the image file into a base64 string so the Gemini API can understand and process it.
    const base64String = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `
      Analyze this receipt image and extract the following information in JSON format:
      - Total amount (just the number)
      - Date (in ISO format)
      - Description or items purchased (brief summary)
      - Merchant/store name
      - Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense )
      
      Only respond with valid JSON in this exact format:
      {
        "amount": number,
        "date": "ISO date string",
        "description": "string",
        "merchantName": "string",
        "category": "string"
      }

      If its not a recipt, return an empty object
    `;

    const result = await model.generateContent([  // function provided by the Google Generative AI SDK (for Gemini models) which takes data and a prompt
      {
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      },
      prompt,
    ]);

    const response = await result.response;
    // console.log("Response from Gemini:", response);
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    try {
      const data = JSON.parse(cleanedText);
      return {
        success: true,
        data: {
          amount: parseFloat(data.amount),
          date: new Date(data.date),
          description: data.description,
          category: data.category,
          merchantName: data.merchantName,
        },
      };
    } catch (parseError) {
      return { success: false, message: "Invalid response format", data: null };
    }
  } catch (error) {
    return { success: false, message: error.message, data: null };
  }
}



export async function getTransaction(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const transaction = await db.transaction.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!transaction) throw new Error("Transaction not found");

  return serializeAmount(transaction);
}


