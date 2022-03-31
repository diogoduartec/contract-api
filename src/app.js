const express = require('express');
const bodyParser = require('body-parser');
const {sequelize, Contract} = require('./model')
const {getProfile} = require('./middleware/getProfile')

const app = express();
const { Op } = require('sequelize');
const res = require('express/lib/response');

app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)


const getTheBestsInRangeOfTime = async (req, profileType, tag, start, end) => {
    // This funtion returns a sorted list with the best payment by tag (profession, profile id, profile name..)
    // profileType: Contractor or Client
    // tag: some key of profile, like profession, id, name..
    // start: start date
    // end: end date

    const {Contract, Job, Profile} = req.app.get('models')

    const contracts = await Contract.findAll({
        include: [
            {
                model: Job,
                where: {
                    paid: true,
                    updatedAt: {[Op.between]: [start, end]}
                }
            },
            {model: Profile, as: profileType}
        ]
    })

    const amountPaidByTag = {}

    contracts.forEach(contract =>  {
        const tagValue = contract[profileType][tag]
        const jobs = contract.Jobs

        if(!(tagValue in amountPaidByTag))
            amountPaidByTag[tagValue] = 0
        amountPaidByTag[tagValue] += jobs.reduce((summation, item) => summation + item.price, 0)
    });

    sortedData = Object.entries(amountPaidByTag).sort(
        (a, b) => b[1] - a[1]
    )

    responseData = sortedData.map((item) => {
        obj = {}
        obj[tag] = item[0]
        obj['amountPaid'] = item[1]
        return obj
    })

    return responseData
}


app.get('/contracts/:id', getProfile, async (req, res) =>{
    const {Contract} = req.app.get('models')
    const {id} = req.params
    const contract = await Contract.findOne({
        where: {
            id: id,
            [Op.or]: [
                {ClientId: req.profile.id},
                {ContractorId: req.profile.id}
            ]
        }
    })
    if(!contract)
        return res.status(404).json({
            'message': `No contract with id ${id} was found for this user`
        })

        res.json(contract)
})

app.get('/contracts', getProfile, async (req, res) =>{
    const {Contract} = req.app.get('models')
    const contracts = await Contract.findAll({
        where: {
            [Op.or]: [
                {ClientId: req.profile.id},
                {ContractorId: req.profile.id}
            ]
        }
    })

    res.json(contracts)
})

app.get('/jobs/unpaid', getProfile, async (req, res) =>{
    const {Contract, Job} = req.app.get('models')
    const jobs = await Job.findAll({
        where: {
            paid: false
        },
        include: [{
            model: Contract,
            where: {
                [Op.or]: [
                    {ClientId: req.profile.id},
                    {ContractorId: req.profile.id}
                ]
            }
        }]
    })
    res.json(jobs)
})

app.post('/jobs/:job_id/pay', getProfile, async (req, res) => {
    const {Job, Profile} = req.app.get('models')
    const {job_id} = req.params
    const job = await Job.findOne({
        where: {
            id: job_id,
            paid: false,
        },
        include: [{
            model: Contract,
            where: {
                ClientId: req.profile.id
            }
        }]
    })

    if(!job)
        return res.status(404).json({
            'message': `No job with id ${id} was found for this user`
        })

    const client = await Profile.findOne({where: {id: req.profile.id}})

    if(job.price > client.balance)
        return res.status(400).json({
            'message': 'Insufficient funds'
        })

    // debit from client
    await Profile.update(
        {balance: sequelize.literal(`balance - ${job.price}`)},
        {where: {id: client.id}}
    )

    // credit on contractor
    await Profile.update(
        {balance: sequelize.literal(`balance + ${job.price}`)},
        {where: {id: job.Contract.ContractorId}}
    )

    // update job payment status
    jobUpdated = await Job.update(
        {paid: true},
        {where: {id: job.id}}
    )

    res.json({message: 'Job successfully paid'})
})

app.post('/balances/deposit/:userId', async (req, res) => {
    const {Contract, Job, Profile} = req.app.get('models')
    const {userId} = req.params
    const {value} = req.body

    const jobs = await Job.findOne({
        where: {paid: false},
        attributes: [[sequelize.fn('SUM', sequelize.col('price')), 'totalToPay']],
        include: [{
            model: Contract,
            where: {
                ClientId: userId
            }
        }],
        raw: true
    })

    // check if value is not bigger than 25% of total jobs to pay
    if (value > jobs.totalToPay / 4)
        return res.status(400).json({
            'message': 'The client cannot deposit more than 25% his total of jobs to pay'
        })

    await Profile.update(
        {balance: sequelize.literal(`balance + ${value}`)},
        {where: {id: userId}}
    )

    res.json({'message': 'Deposit executed successfully!'})
})

app.get('/admin/best-profession', async (req, res) => {
    const start = req.query.start
    const end = req.query.end

    responseData = await getTheBestsInRangeOfTime(req, 'Contractor', 'profession', start, end)

    res.json(responseData)
})

app.get('/admin/best-client', async (req, res) => {
    const start = req.query.start
    const end = req.query.end
    const limit = req.query.limit || 2

    responseData = await getTheBestsInRangeOfTime(req, 'Client', 'id', start, end)

    res.json(responseData.slice(0, limit))
})

module.exports = app;

