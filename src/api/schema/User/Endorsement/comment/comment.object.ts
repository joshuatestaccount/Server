import { extendType, inputObjectType, objectType } from 'nexus';
import { prisma } from '../../../../../server.js';
export const commentInput = inputObjectType({
    name: "commentInput",
    definition(t) {
        t.string("message");
        t.string("notes");
    },
})
export const commentObject = objectType({
    name: "comment",
    definition(t) {
        t.id("commentID");
        t.string("message");
        t.string("notes");
        t.date("createdAt");
        t.date("updatedAt");
        t.list.field("user", {
            type: "user",
            resolve: async (parent): Promise<any> => {
                return await prisma.user.findMany({
                    where: {
                        Comment: {
                            some: {
                                commentID: parent.commentID
                            }
                        }
                    }
                })
            }
        })
    },
})