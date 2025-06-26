"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const serializeDecimal = (obj) => {
  const serialized = { ...obj };
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }
  return serialized;
};


export async function updateDefaultAccount(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // First, unset any existing default account
    await db.account.updateMany({
      where: {
        userId: user.id,
        isDefault: true,
      },
      data: { isDefault: false },
    });

    // Then set the new default account
    const account = await db.account.update({
      where: {
        id: accountId,
        userId: user.id,
      },
      data: { isDefault: true },
    });

    revalidatePath("/dashboard");
    return { success: true, data: serializeDecimal(account) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


export  const getAccountWithTransaction = async (accountId) => {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const account = await db.account.findUnique({
      where: {
        id: accountId,
        userId: user.id,
      },
      include: {
        transactions: {
          orderBy: { date: "desc" },
        },
        _count: {
          select: { transactions: true },
        },
      }
    });
    
  if (!account) return null;

  return {
    ...serializeDecimal(account),
    transactions: account.transactions.map(serializeDecimal),
    //serializing each transaction by map
  };
    
  } catch (error) {
    throw new Error(`Failed to fetch account: ${error.message}`);
  }
} 



// https://chatgpt.com/share/68417a6a-ac44-8007-952e-b60bef923592
// refer this link for more details on how to use this function
// use this function to delete multiple transactions from multiple accounts
// export async function bulkDeleteTransactions(transactionIds) {
  
//   try {
//     const { userId } = await auth();
//     if (!userId) throw new Error("Unauthorized");

//     const user = await db.user.findUnique({
//       where: { clerkUserId: userId },
//     });

//     if (!user) throw new Error("User not found");

//     // Get transactions to calculate balance changes
//     const transactions = await db.transaction.findMany({
//       where: {
//         id: { in: transactionIds },
//         // “Find all transactions where the id is one of the values in the transactionIds array.”
//         userId: user.id,
//       },
//     });
//   console.log(transactions);


//     // Group transactions by account to update balances
//     //although its not necessary to group by account, cause always current transactions are from the same account
//     const accountBalanceChanges = transactions.reduce((acc, transaction) => {
//       const change =  
//         transaction.type === "EXPENSE"
//           ? transaction.amount
//           : -transaction.amount;
//       acc[transaction.accountId] = (acc[transaction.accountId] || 0) + change;  //grouping balance change for multiple accounts 
//       return acc;
//     }, {});

//     // Delete transactions and update account balances in a transaction
//     await db.$transaction(async (tx) => {
//       // Delete transactions
//       await tx.transaction.deleteMany({
//         where: {
//           id: { in: transactionIds },
//           userId: user.id,
//         },
//       });

//       // Update account balances
//       for (const [accountId, balanceChange] of Object.entries(
//         accountBalanceChanges
//       )) {
//         await tx.account.update({
//           where: { id: accountId },
//           data: {
//             balance: {
//               increment: balanceChange,
//             },
//           },
//         });
//       }
//     });

//     revalidatePath("/dashboard");
//     revalidatePath("/account/[id]");

//     return { success: true };
//   } catch (error) {
//     return { success: false, error: error.message };
//   }
// }

//use this function to delete multiple transactions from same accounts
export async function bulkDeleteTransactions(transactionIds) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Fetch all transactions to calculate balance change and account ID
    const transactions = await db.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId: user.id,
      },
    });

    if (transactions.length === 0) throw new Error("No transactions found");

    // Get accountId (assuming all transactions are from same account)
    const accountId = transactions[0].accountId;

    // Calculate balance change without reduce
    let balanceChange = 0;
    for (const transaction of transactions) {
      if (transaction.type === "EXPENSE") {
        balanceChange += transaction.amount;
      } else {
        balanceChange -= transaction.amount;
      }
    }

    // Perform DB transaction
    await db.$transaction(async (tx) => {
      // Delete all selected transactions
      await tx.transaction.deleteMany({
        where: {
          id: { in: transactionIds },
          userId: user.id,
        },
      });

      // Update account balance
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/account/[id]");

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
