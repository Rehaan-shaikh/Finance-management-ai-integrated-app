"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getCurrentBudget(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const budget = await db.budget.findFirst({
      where: {
        userId: user.id,  //cause there can only be one budget per user for therir default account
      },
    });

    // Get current month's expenses
    const currentDate = new Date();
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

// .aggregate() is used when you want to perform mathematical operations on your data, such as:
// sum ➝ add up values (like total expenses) ,avg ➝ average, min / max ➝ smallest or largest value, count ➝ number of matching records
const expenses = await db.transaction.aggregate({
  where: {
    userId: user.id, // Only transactions that belong to the currently logged-in user
    type: "EXPENSE", // Only include expense transactions (not income)
    date: {
      gte: startOfMonth, // Date should be greater than or equal to start of the month
      lte: endOfMonth,   // Date should be less than or equal to end of the month
    },
    accountId, // Only include transactions for the specified accountId which is default account (passed as function argument from dashboard page)
  },

  // Aggregation logic
  _sum: {
    amount: true, // Sum up the 'amount' field of the filtered transactions
  },
});

    return {
      budget: budget ? { ...budget, amount: budget.amount.toNumber() } : null,
      currentExpenses: expenses._sum.amount
        ? expenses._sum.amount.toNumber()
        : 0,
    };
  } catch (error) {
    console.error("Error fetching budget:", error);
    throw error;
  }
}




export async function updateBudget(amount) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Update or create budget
    // upsert updates a record if it exists, or creates it if it doesn't — all in one query.
    const budget = await db.budget.upsert({
      where: {
        userId: user.id,
      },
      update: {
        amount,
      },
      create: {
        userId: user.id,
        amount,
      },
    });

    revalidatePath("/dashboard");
    return {
      success: true,
      data: { ...budget, amount: budget.amount.toNumber() },
    };
  } catch (error) {
    console.error("Error updating budget:", error);
    return { success: false, error: error.message };
  }
}
