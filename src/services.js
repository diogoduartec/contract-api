const {sequelize, Contract, Job, Profile} = require('./model')
const { Op } = require('sequelize');


const getContractById = async (contractId, profileId) => {
    return await Contract.findOne({
        where: {
            id: contractId,
            [Op.or]: [
                {ClientId: profileId},
                {ContractorId: profileId}
            ]
        }
    })
}

const getContracts = async (profileId) => {
    return await Contract.findAll({
        where: {
            [Op.or]: [
                {ClientId: profileId},
                {ContractorId: profileId}
            ]
        }
    })
}

const getUnpaidJobs = async (profileId) => {
    return await Job.findAll({
        where: {
            paid: false
        },
        include: [{
            model: Contract,
            where: {
                [Op.or]: [
                    {ClientId: profileId},
                    {ContractorId: profileId}
                ]
            }
        }]
    })
}

const getUnpaidJobById = async (jobId, clientId) => {
    return await Job.findOne({
        where: {
            id: jobId,
            paid: false,
        },
        include: [{
            model: Contract,
            where: {
                ClientId: clientId
            }
        }]
    })
}

const getTotalJobPricesToPayByClient = async (clientId) => {
    const jobs = await Job.findOne({
        where: {paid: false},
        attributes: [[sequelize.fn('SUM', sequelize.col('price')), 'totalToPay']],
        include: [{
            model: Contract,
            where: {
                ClientId: clientId
            }
        }],
        raw: true
    })

    return jobs.totalToPay
}

const payAJob = async (jobId) => {
    await Job.update(
        {paid: true},
        {where: {id: job.id}}
    )
}

const getProfileById = async (profileId) => {
    return await Profile.findOne({where: {id: profileId}})
}

const debitProfileBalance = async (profileId, amountToDebit) => {
    await Profile.update(
        {balance: sequelize.literal(`balance - ${amountToDebit}`)},
        {where: {id: profileId}}
    )
}

const creditProfileBalance = async (profileId, amountToDebit) => {
    await Profile.update(
        {balance: sequelize.literal(`balance + ${amountToDebit}`)},
        {where: {id: profileId}}
    )
}

const getSumOfPaidJobPricesGroupedByProfile = async (profileType, fieldToGroupFor, start, end) => {
    const jobs = await Job.findAll({
        where: {
            paid: true,
            updatedAt: {[Op.between]: [start, end]}
        },
        include: {
            model: Contract
        }
    })

    summationPriceGroupedByField = {}

    await Promise.all(jobs.map(async (job) => {
        const profile = await Profile.findOne({
            where: {id: profileType == 'Contractor' ? job.Contract.ContractorId : job.Contract.ClientId}
        })

        const fieldValue = profile[fieldToGroupFor]

        if(!(fieldValue in summationPriceGroupedByField))
            summationPriceGroupedByField[fieldValue] = 0

        summationPriceGroupedByField[fieldValue] += job.price
    }))

    sortedData = Object.entries(summationPriceGroupedByField).sort(
        (a, b) => b[1] - a[1]
    )

    responseData = sortedData.map((item) => {
        obj = {}
        obj[fieldToGroupFor] = item[0]
        obj['amountPaid'] = item[1]
        return obj
    })

    return responseData

}

module.exports = {
    getContractById,
    getContracts,
    getUnpaidJobs,
    getUnpaidJobById,
    getTotalJobPricesToPayByClient,
    payAJob,
    getProfileById,
    debitProfileBalance,
    creditProfileBalance,
    getSumOfPaidJobPricesGroupedByProfile
}