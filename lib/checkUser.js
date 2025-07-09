import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async () => {
    const user = await currentUser();
    // console.log("User from Clerk:", user);  
    // //it contains user information like id, firstName, lastName, emailAddresses, etc and more...

    if (!user) {
        return null;
    }

    try {
        const loggedInUser = await db.user.findUnique({  //check if user exists in the database
            where : {
                clerkUserId: user.id,
            }
        });

        if (loggedInUser) {
            return loggedInUser;
        }

        const name = `${user.firstName} ${user.lastName}`;
        const newUser = await db.user.create({
            data: {
                clerkUserId: user.id,
                name,
                imageUrl: user.imageUrl,
                email: user.emailAddresses[0].emailAddress,
            },
        });
        return newUser;
    } catch (error) {
        console.error("Error checking user:", error);
        return null;
    }

}
