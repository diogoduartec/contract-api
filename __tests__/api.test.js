const request = require('supertest')
const { Profile, Contract, Job } = require('../src/model')
const app = require('../src/app')

const createProfile = async (type, profession='Programmer') => {
    return await Profile.create({
        firstName: `Harry ${type}`,
        lastName: `Potter ${type}`,
        profession: profession,
        balance: 1150,
        type: type
    })
}

const createContract = async (clientId, contractorId) => {
    return await Contract.create({
        terms: 'bla bla bla',
        status: 'terminated',
        ClientId: clientId,
        ContractorId: contractorId
    })
}

const createJob = async (contractId, paid, price=200) => {
    return await Job.create({
        description: 'work',
        price: price,
        paid: paid,
        ContractId: contractId,
      })
}

beforeEach(async () => {
    // reset tables befor each test
    await Profile.sync({ force: true });
    await Contract.sync({ force: true });
    await Job.sync({ force: true });
})

describe('GET /contracts/:id', () => {

    it('should return contract successfully', async () => {
        clientProfile = await createProfile('client')
        contractorProfile = await createProfile('contractor')
        contract = await createContract(clientProfile.id, contractorProfile.id)


        const response = await request(app)
            .get(`/contracts/${contract.id}`)
            .set('profile_id', clientProfile.id)

        expect(response.status).toBe(200)

        expect(response.body).toEqual(
            expect.objectContaining({
                id: contract.id,
                terms: contract.terms,
                status: contract.status,
                ClientId: contract.ClientId,
                ContractorId: contract.ContractorId
            })
        )
    })

    it('should return 404 error, because the contract does not belongs to the profile calling', async () => {
        clientProfile = await createProfile('client')
        clientProfileInvalid = await createProfile('client')
        contractorProfile = await createProfile('contractor')
        contract = await createContract(clientProfile.id, contractorProfile.id)

        const response = await request(app)
            .get(`/contracts/${contract.id}`)
            .set('profile_id', clientProfileInvalid.id)

        expect(response.status).toBe(404)

    })
})

describe('GET /contracts', () => {
    it('should return contract list with only one contract', async () => {
        clientProfile1 = await createProfile('client')
        contractorProfile1 = await createProfile('contractor')
        clientProfile2 = await createProfile('client')
        contractorProfile2 = await createProfile('contractor')
        contract1 = await createContract(clientProfile1.id, contractorProfile1.id)
        contract2 = await createContract(clientProfile2.id, contractorProfile2.id)

        const response = await request(app)
            .get('/contracts')
            .set('profile_id', clientProfile1.id)

        expect(response.status).toBe(200)
        expect(response.body.length).toBe(1)
    })
})

describe('GET /jobs/unpaid', () => {
    it('should return only one job', async () => {
        clientProfile = await createProfile('client')
        contractorProfile = await createProfile('contractor')
        contract = await createContract(clientProfile.id, contractorProfile.id)
        job1 = await createJob(contract.id, false)
        job2 = await createJob(contract.id, true)

        const response = await request(app)
            .get('/jobs/unpaid')
            .set('profile_id', clientProfile.id)

        expect(response.status).toBe(200)

        expect(response.body.length).toBe(1)
    })
})

describe('POST /jobs/:job_id/pay', () => {
    it('should pay for job successfully', async () => {
        clientProfile = await createProfile('client')
        contractorProfile = await createProfile('contractor')
        contract = await createContract(clientProfile.id, contractorProfile.id)
        job = await createJob(contract.id, false)

        const response = await request(app)
            .post(`/jobs/${job.id}/pay`)
            .set('profile_id', clientProfile.id)

        expect(response.status).toBe(200)

        updatedJob = await Job.findOne({where: {id: job.id}})
        updatedClientProfile = await Profile.findOne({where: {id: clientProfile.id}})
        updatedContractorProfile = await Profile.findOne({where: {id: contractorProfile.id}})

        expect(updatedJob.paid).toBe(true)
        expect(updatedClientProfile.balance).toBe((clientProfile.balance - job.price))
        expect(updatedContractorProfile.balance).toBe((contractorProfile.balance + job.price))
    })
})

describe('GET /admin/best-profession?start=<date>&end=<date>', () => {
    it('should returns in this order: programmer, musician, fighter', async () => {
        clientProfile = await createProfile('client')
        programmerProfile = await createProfile('contractor')
        musicianProfile = await createProfile('contractor', 'Musician')
        fighterProfile = await createProfile('contractor', 'Fighter')

        contractForProgrammer = await createContract(clientProfile.id, programmerProfile.id)
        contractForMusician = await createContract(clientProfile.id, musicianProfile.id)
        contractForFigher = await createContract(clientProfile.id, fighterProfile.id)

        createJob(contractForProgrammer.id, true, 2000)
        createJob(contractForMusician.id, true, 1000)
        createJob(contractForMusician.id, true, 999)
        createJob(contractForFigher.id, true, 1000)

        const response = await request(app)
            .get('/admin/best-profession?start=2022-03-31&end=2022-12-31')
            .set('profile_id', clientProfile.id)

        expect(response.status).toBe(200)

        expect(response.body).toEqual([
            {
                "profession": "Programmer",
                "amountPaid": 2000
            },
            {
                "profession": "Musician",
                "amountPaid": 1999
            },
            {
                "profession": "Fighter",
                "amountPaid": 1000
            }
        ])
    })
})

describe('GET /admin/best-profession?start=<date>&end=<date>', () => {
    it('should returns in this order: programmer, musician, fighter', async () => {
        clientProfile = await createProfile('client')
        programmerProfile = await createProfile('contractor')
        musicianProfile = await createProfile('contractor', 'Musician')
        fighterProfile = await createProfile('contractor', 'Fighter')

        contractForProgrammer = await createContract(clientProfile.id, programmerProfile.id)
        contractForMusician = await createContract(clientProfile.id, musicianProfile.id)
        contractForFigher = await createContract(clientProfile.id, fighterProfile.id)

        createJob(contractForProgrammer.id, true, 2000)
        createJob(contractForMusician.id, true, 1000)
        createJob(contractForMusician.id, true, 999)
        createJob(contractForFigher.id, true, 1000)

        const response = await request(app)
            .get('/admin/best-profession?start=2022-03-31&end=2022-12-31')
            .set('profile_id', clientProfile.id)

        expect(response.status).toBe(200)

        expect(response.body).toEqual([
            {
                "profession": "Programmer",
                "amountPaid": 2000
            },
            {
                "profession": "Musician",
                "amountPaid": 1999
            },
            {
                "profession": "Fighter",
                "amountPaid": 1000
            }
        ])
    })
})


describe('GET /admin/best-client?start=<date>&end=<date>', () => {
    it('should returns in this order: clientId=2, ClientId=1', async () => {
        clientProfile1 = await createProfile('client')
        clientProfile2 = await createProfile('client')
        contractorProfile = await createProfile('contractor')
        contract1 = await createContract(clientProfile1.id, contractorProfile.id)
        contract2 = await createContract(clientProfile2.id, contractorProfile.id)

        createJob(contract1.id, true, 999)
        createJob(contract1.id, true, 1000)
        createJob(contract2.id, true, 2000)

        const response = await request(app)
            .get('/admin/best-client?start=2022-03-31&end=2022-12-31')
            .set('profile_id', clientProfile.id)

        expect(response.status).toBe(200)

        expect(response.body).toEqual([
            {
                "id": "2",
                "amountPaid": 2000
            },
            {
                "id": "1",
                "amountPaid": 1999
            }
        ])
    })
})