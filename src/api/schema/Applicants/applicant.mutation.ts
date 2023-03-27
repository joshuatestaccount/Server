import { GraphQLError } from 'graphql'
import { extendType, idArg, nonNull, stringArg } from 'nexus'
import { prisma } from '../../../server.js'
import { AWSFileUpload, AWSVideoUpload } from '../../helpers/awsFileUpload.js'
import { generateUUID } from '../../helpers/generateUUID.js'
import signature from 'jsonwebtoken'
import { GESend } from '../../helpers/email.js'


const { sign } = signature

export const applicaitonMutation = extendType({
    type: "Mutation",
    definition(t) {
        t.field("createApplication", {
            type: "application",
            args: { jobPostID: nonNull(idArg()), email: nonNull("EmailAddress"), Profile: "ProfileInput", Address: "AddressInput", file: "Upload", video: 'Upload' },
            resolve: async (_, { jobPostID, email, Profile: { birthday, lastname, firstname, phone }, Address: { city, province, street, zipcode }, file, video }): Promise<any> => {
                const { createReadStream: fileReadStream, filename: filesName } = await file
                const { createReadStream: videoReadStream, filename: videoFileName } = await video

                return await prisma.$transaction(async () => {
                    const app = await prisma.applicant.create({
                        data: {
                            email,
                            id: generateUUID(new Date().getTime()),
                            createdAt: new Date(Date.now()),
                            updatedAt: new Date(Date.now()),
                            status: "waiting",
                            FileUpload: {
                                create: {
                                    file: await AWSFileUpload(filesName, fileReadStream),
                                    video: await AWSVideoUpload(videoFileName, videoReadStream),
                                    createdAt: new Date(Date.now()),
                                }
                            },

                            Profile: {
                                create: {
                                    firstname,
                                    lastname,
                                    phone,
                                    birthday,
                                    Address: {
                                        create: {
                                            city,
                                            province,
                                            street,
                                            zipcode,
                                        }
                                    }
                                }
                            },
                            JobPost: {
                                connect: {
                                    jobPostID
                                }
                            }
                        },
                        include: {
                            Profile: true,
                            JobPost: true
                        }
                    })


                    await prisma.notification.create({
                        data: {
                            title: "New Applicant",
                            createdAt: new Date(Date.now()),
                            notificationStatus: "unread",
                            Applicant: {
                                connect: {
                                    applicantID: app.applicantID
                                }
                            }
                        }
                    })

                    GESend(email, `Dear Mr./Ms./Mrs. <b>${app.Profile.lastname}</b>,<br><br>Your application for the position of <b>${app.JobPost.title}</b> at <b>Global Headstart Specialist Inc.</b> has been received. Our hiring team is currently reviewing all applications for this position. If you are one of the qualifying applicants to proceed to the interview process, our recruiters will contact you for your interview schedule.<br><br>Please be guided by the following phases of the application process:<br><br><b>Phase 1: Initial Application</b> - The applicant’s application is received and processed by the recruiters of Global Headstart Specialist Inc. If the application is approved, it will proceed to the next phase of the application process. Otherwise, the application cannot proceed further from the application process.<br><br><b>Phase 2: Endorsement of Application</b> -  During this phase, the application is approved to be subject to endorsement to employers. If the application’s endorsement to a specific company is approved, it will advance to phase three (3) of the application process. Otherwise, the application will be unable to continue to the next phase of the application process. <br><br><b>Phase 3: Endorsed Application</b> - Once the applicant’s application has been endorsed to employers, it is now in the last phase of the application process, where employers may approve or reject the application, determining whether or not the applicant will be hired.<br><br> Kindly anticipate hearing from us soon regarding the status of your application.<br><br>Thank you for your interest in our company, and we appreciate the time you invested in this application.<br><br>Your Application ID: <b>${app.id}</b> <br><br><br>Regards, <br><br><b>Global Headstart Specialist Inc.</b>
                    `, "Application Received")

                    return app
                })
            }
        })

        t.field("updateApplicantStatus", {
            type: "application",
            args: { applicantID: nonNull(idArg()), status: nonNull(stringArg()), userID: nonNull(idArg()) },
            resolve: async (_, { applicantID, status, userID }): Promise<any> => {

                const findUser = await prisma.user.findUnique({
                    where: {
                        userID
                    },
                    include: {
                        Profile: true
                    }
                })


                await prisma.logs.create({
                    data: {
                        title: "Applicant Status updated",
                        createdAt: new Date(Date.now()),
                        modifiedBy: `${findUser.Profile.firstname} ${findUser.Profile.lastname}`,
                        User: {
                            connect: {
                                userID: findUser.userID
                            }
                        }
                    }
                })
                if (status === "approved") {
                    const app = await prisma.applicant.update({
                        data: {
                            status: {
                                set: status as any
                            },
                            Endorsement: {
                                create: {
                                    createdAt: new Date(Date.now()),
                                    updatedAt: new Date(Date.now()),
                                    Status: "Pending",
                                    Company: {
                                        connect: {
                                            companyID: findUser.companyID
                                        }
                                    },
                                    User: {
                                        connect: {
                                            userID
                                        }
                                    }
                                }
                            },
                            Notification: {
                                update: {
                                    notificationStatus: "read"
                                }
                            }
                        },
                        where: {
                            applicantID
                        },
                        include: {
                            Profile: true,
                            JobPost: true
                        },
                    })

                    GESend(app.email, `Dear Mr./Ms./Mrs. <b>${app.Profile.lastname}</b>, <br><br>Congratulations!<br><br>We are pleased to inform you that your application for the <b>${app.JobPost.title}</b> position at <b>Global Headstart Specialist Inc.</b></br> has been approved. Your application will now proceed to the <b>second phase</b> of the application process—endorsement of application to employers. Our recruitment team will contact you for further details and instructions.<br><br>We appreciate your interest in working with us and look forward to working with you soon.<br><br><br>Regards,<br><br><b>Global Headstart Specialist Inc.</b>
                    `, "Application Status")

                    return app


                }


                if (status === "rejected") {
                    const app = await prisma.applicant.update({
                        data: {
                            status: {
                                set: status as any
                            },
                            Notification: {
                                update: {
                                    notificationStatus: "read"
                                }
                            }
                        },
                        where: {
                            applicantID
                        },
                        include: {
                            Profile: true
                        }
                    })

                    GESend(app.email, `Dear Mr./Ms./Mrs <b>${app.Profile.lastname}</b>, <br><br>After carefully and thoroughly evaluating a significant number of applications; unfortunately, we won’t be able to invite you to the next stage of the hiring process at this time. Despite your impressive resume, we have decided to move forward with a candidate whose qualifications are better suited to this particular position.  <br><br> Please be informed that you will not be able to apply for another position for the <b>next thirty (30) days</b>. <br><br>Once again, thank you so much for taking the time to apply to our company. We wish you the best of luck and much success in your future endeavors.<br><br><br>Regards,<br><br><b>Global Headstart Specialist Inc.</b>`, "Application Rejected")


                    return app
                }
            }
        })
        t.field("terminateMyApplication", {
            type: "application",
            args: { applicantID: nonNull(idArg()) },
            resolve: async (_, { applicantID }): Promise<any> => {

                const app = await prisma.applicant.findUnique({
                    where: { id: applicantID },
                    include: {
                        Profile: true,
                        JobPost: true
                    }
                })
                GESend(app.email, `Dear Mr./Ms./Mrs <b>${app.Profile.lastname}</b>,<br><br> Your application for ${app.JobPost.title} has been terminated. We appreciate your time and effort in applying for the said job. We truly wish for your successful career and best of luck on your future endeavors.<br><br><br>Regards, <br><br><b>Global Headstart Specialist Inc.</b>`, `Application Terminated`)
                return await prisma.applicant.delete({
                    where: {
                        id: applicantID
                    }
                })
            }
        })
        t.field("viewMyApplication", {
            type: "token",
            args: { id: nonNull(stringArg()), email: nonNull("EmailAddress") },
            resolve: async (_, { email, id }, { res }): Promise<any> => {

                const findId = await prisma.applicant.findUnique({
                    where: {
                        id
                    }
                })

                if (!findId) throw new GraphQLError("Invalid Applicant No.")

                const token = sign({ applicantID: findId.id }, "HeadStart", {
                    algorithm: "HS512",
                    expiresIn: "1d",
                    noTimestamp: false
                })

                const app = await prisma.applicant.findFirst({
                    where: {
                        AND: {
                            id: findId.id,
                            email: {
                                equals: email
                            }
                        }
                    }
                })


                res.cookie("ghs_access_applicant", token, {
                    httpOnly: false,
                    sameSite: "none",
                    secure: true
                })

                if (!app) throw new GraphQLError("Invalid Email Address")

                return { token }
            }
        })
        t.list.field("generateApplicantCSV", {
            type: "application",
            args: { status: nonNull(stringArg()), start: nonNull(stringArg()), end: nonNull(stringArg()), order: nonNull(stringArg()) },
            resolve: async (_, { status, start, end, order }): Promise<any> => {
                return await prisma.$queryRawUnsafe(`SELECT * FROM PUBLIC."Applicant" 
                where "status" = '${status}' AND "createdAt" between '${start}' AND '${end}'
                ORDER by public."Applicant"."createdAt" ${order}`)
            }
        })
    },
})  