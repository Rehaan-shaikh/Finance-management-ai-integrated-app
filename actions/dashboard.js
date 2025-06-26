'use server';

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const serializeTransaction = (obj) => {
  const serialized = { ...obj };
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }
  return serialized;
};

export async function getUserAccounts() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  try {
    const accounts = await db.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });
    // console.log(accounts, "accounts in action");

    // Serialize accounts before sending to client
    const serializedAccounts = accounts.map(serializeTransaction);

    return serializedAccounts;
  } catch (error) {
    console.error(error.message);
  }
}


export const CreateAccount = async (prevState, formData) => {
  const user = await auth();
  if (!user || !user.userId) {
    return { success: false, message: "User not authenticated" };
  }

  const errors = {};
  const name = formData.get("name")?.trim();
  const type = formData.get("type")?.trim();
  const balance = formData.get("balance");
  const isDefault = formData.get("isDefault") === "on";

  // Validation
  if (!name) errors.name = "Account name is required";
  if (!type) errors.type = "Account type is required";
  if (!balance) {
    errors.balance = "Initial balance is required";
  } else if (isNaN(parseFloat(balance))) {
    errors.balance = "Initial balance must be a valid number";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, message: "Validation failed" };
  }

  try {
    const User = await db.user.findUnique({
      where: {
        clerkUserId: user.userId,
      },
    });

    if (!User) {
      return { success: false, message: "User not found in DB" };
    }
  console.log(formData , "formData in action" ,user );


    const balanceFloat = parseFloat(balance);

    const existingAccount = await db.account.findFirst({
      where: { userId: User.id },
    });

    const defaultAcc = !existingAccount || isDefault;

    if (defaultAcc) {
      await db.account.updateMany({
        where: { userId: User.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const account = await db.account.create({
      data: {
        name,
        type,
        balance: balanceFloat,
        isDefault: defaultAcc,
        userId: User.id,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: serializeTransaction(account) };
  } catch (error) {
    return {
      success: false,
      errors,
      message: error.message || "Failed to create account",
    };
  }
};


export async function getDashboardData() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get all user transactions
  const transactions = await db.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
  });

  return transactions.map(serializeTransaction);
}