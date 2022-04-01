const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const {getProfile} = require('./middleware/getProfile')
const services = require('./services');
const app = express();

app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)


app.get('/contracts/:id', getProfile, async (req, res) =>{
    const {id} = req.params
    const contract = await services.getContractById(id, req.profile.id)

    if(!contract){
        return res.status(404).json({
            'message': `No contract with id ${id} was found for this user`
        })
    }

    res.json(contract)
})

app.get('/contracts', getProfile, async (req, res) =>{
    const contracts = await services.getContracts(req.profile.id)
    res.json(contracts)
})

app.get('/jobs/unpaid', getProfile, async (req, res) =>{
    const jobs = await services.getUnpaidJobs(req.profile.id)
    res.json(jobs)
})

app.post('/jobs/:job_id/pay', getProfile, async (req, res) => {
    const {job_id} = req.params
    const job = await services.getUnpaidJobById(job_id, req.profile.id)

    if(!job){
        return res.status(404).json({
            'message': `No job with id ${id} was found for this user`
        })
    }

    const client = await services.getProfileById(req.profile.id)

    if(job.price > client.balance){
        return res.status(400).json({
            'message': 'Insufficient funds'
        })
    }

    // debit from client
    await services.debitProfileBalance(client.id, job.price)

    // credit on contractor
    await services.creditProfileBalance(job.Contract.ContractorId, job.price)

    // update job payment status
    await services.payAJob(job.id)

    res.json({message: 'Job successfully paid'})
})

app.post('/balances/deposit/:userId', async (req, res) => {
    const {userId} = req.params
    const {value} = req.body

    const totalToPay = await services.getTotalJobPricesToPayByClient(userId)

    // check if value is not bigger than 25% of total jobs to pay
    if (value > totalToPay / 4){
        return res.status(400).json({
            'message': 'The client cannot deposit more than 25% his total of jobs to pay'
        })
    }

    await services.debitProfileBalance(userId, value)

    res.json({'message': 'Deposit executed successfully!'})
})

app.get('/admin/best-profession', async (req, res) => {
    const start = req.query.start
    const end = req.query.end

    responseData = await services.getSumOfPaidJobPricesGroupedByProfile(
        'Contractor', 'profession', start, end
    )

    res.json(responseData)
})

app.get('/admin/best-client', async (req, res) => {
    const start = req.query.start
    const end = req.query.end
    const limit = req.query.limit || 2

    responseData = await services.getSumOfPaidJobPricesGroupedByProfile(
        'Client', 'id', start, end
    )

    res.json(responseData.slice(0, limit))
})

module.exports = app;

