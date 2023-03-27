import { objectType } from "nexus";
import { prisma } from "../../../../../server.js";




export const endorseObject = objectType({
    name: "endorse",
    definition(t) {
        t.id("endorseID");
        t.string("endorseStatus");
        t.date("createdAt");
        t.list.field("endorsement", {
            type: "endorsement",
            resolve: async (parent): Promise<any> => {
                return await prisma.endorsement.findMany({
                    where: {
                        Endorse: {
                            some: {
                                endorseID: parent.endorseID
                            }
                        }
                    }
                })
            }
        })
        t.list.field("feedback", {
            type: "feedback",
            resolve: async (parent): Promise<any> => {
                return await prisma.feedback.findMany({
                    where: {
                        endorseID: parent.endorseID
                    }
                })
            }
        })
        t.list.field("company", {
            type: "company",
            resolve: async (parent): Promise<any> => {
                return await prisma.company.findMany({
                    where: {
                        Endorse: {
                            some: {
                                endorseID: parent.endorseID
                            }
                        }
                    }
                })
            }
        })
        t.list.field("user", {
            type: "user",
            resolve: async (parent): Promise<any> => {
                return await prisma.user.findMany({
                    where: {
                        Endorse: {
                            some: {
                                endorseID: parent.endorseID
                            }
                        }
                    }
                })
            }
        })
    },
})