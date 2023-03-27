import { extendType, idArg, nonNull, stringArg } from 'nexus'
import { prisma } from '../../../../../../server.js'
import { GESend } from '../../../../../helpers/email.js'



export const feedbackMutation = extendType({
    type: "Mutation",
    definition(t) {
        t.field("createAFeedback", {
            type: "feedback",
            args: { feedback: nonNull(stringArg()), userID: nonNull(idArg()), applicantID: nonNull(idArg()), endorseID: nonNull(idArg()) },
            resolve: async (_, { feedback, endorseID, userID, applicantID }): Promise<any> => {

                const applicant = await prisma.applicant.findMany({
                    where: {
                        applicantID
                    },
                    include: {
                        Profile: true
                    }
                })
                const feedbacks = await prisma.feedback.create({
                    data: {
                        feedback,
                        Endorse: {
                            connect: {
                                endorseID
                            }
                        },
                        Applicant: {
                            connect: {
                                applicantID
                            }
                        },
                        User: {
                            connect: {
                                userID
                            }
                        },
                        createdAt: new Date(Date.now())
                    }
                })

                GESend(applicant[ 0 ].email, `Dear Mr./Ms./Mrs. <b>${applicant[ 0 ].Profile.lastname}</b>, <br><br> Upon review your application, the client company have provided the following feedback to your application<br><br><i>${feedback}</i><br><br><br>Regards, <br><br><b>Global Headstart Specialist Inc.</b>`, `Employer Feedback on Application`)

                return feedbacks
            }
        })
    },
})