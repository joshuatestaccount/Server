import { extendType, idArg, nonNull } from 'nexus'
import { prisma } from '../../../../../server.js'
import { Dates } from '../../../../helpers/dateFormat.js'



export const commentMutation = extendType({
    type: "Mutation",
    definition(t) {
        t.field("createComment", {
            type: "comment",
            args: { endorsementID: nonNull(idArg()), userID: nonNull(idArg()), comments: "commentInput", },
            resolve: async (_, { endorsementID, userID, comments: { message, notes } }): Promise<any> => {
                return await prisma.comment.create({
                    data: {
                        message, notes,
                        createdAt: Dates,
                        updatedAt: Dates,
                        User: {
                            connect: {
                                userID
                            }
                        },
                        Endorsement: {
                            connect: {
                                endorsementID
                            }
                        }
                    }
                })
            }
        })
        t.field("deleteComment", {
            type: "comment",
            args: { commentID: nonNull(idArg()) },
            resolve: async (_, { commentID }): Promise<any> => {
                return await prisma.comment.delete({
                    where: {
                        commentID
                    }
                })
            }
        })
    
    },
})