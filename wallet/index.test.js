const Wallet = require('./index');
const Transaction = require('./transaction')
const Blockchain = require('../blockchain/index')
const { verifySignature } = require('../util/index');
const { STARTING_BALANCE } = require('../config');
describe('Wallet',()=>{
    let wallet;
    beforeEach(()=>{
        wallet = new Wallet();
    });

    it('has a `balance`', ()=>{
        expect(wallet).toHaveProperty('balance')
    })
    it('has a `publicKey`',()=>{
        expect(wallet).toHaveProperty('publicKey')
    })

    describe('signing data', ()=>{
        const data = 'foobar';

        it('verifies a signature', ()=>{
            expect(
                verifySignature({
                    publicKey: wallet.publicKey,
                    data,
                    signature: wallet.sign(data),
                })
            ).toBe(true)
        })
        it('does not verify an invalid signature', ()=>{
            expect(
                verifySignature({
                    publicKey: wallet.publicKey,
                    data,
                    signature: new Wallet().sign(data)
                })
            ).toBe(false)
        })
    })

    describe('createTransaction()',()=>{
        describe('and the amount exceeds the balance', ()=>{
            it('throws an error', ()=>{
                expect(()=> wallet.createTransaction({ amount: 999999, recipient: 'foo-recipient'}))
                    .toThrow('Amount exceeds balance')
            })
        })

        describe('and the amount is valid',()=>{
            let transaction, amount, recipient;
            beforeEach(()=>{
                amount = 50;
                recipient = 'foo-recipient'
                transaction = wallet.createTransaction({wallet, recipient, amount})
            })
            it('creates an instatce of `Transaction`', ()=>{
                expect(transaction instanceof Transaction).toBe(true)
            })

            it('matches the transaction input with the wallet', ()=>{
                expect(transaction.input.address).toEqual(wallet.publicKey)
            })

            it('outputs the amount to the recipient', ()=>{
                expect(transaction.outputMap[recipient]).toEqual(amount)
            })
        })

        describe('and a chain is passed', ()=>{
            it('calls `Wallet.calculateBalance`', ()=>{
                const calculateBalanceMock = jest.fn();
                const originalCaluclateBalance = Wallet.calculateBalance;

                Wallet.calculateBalance = calculateBalanceMock;

                wallet.createTransaction({
                    recipient: 'foo',
                    amount: 10,
                    chain: new Blockchain().chain
                })

                expect(calculateBalanceMock).toHaveBeenCalled();

                Wallet.calculateBalance = originalCaluclateBalance;
            })
        })
    })
    
    describe('calculateBalance()', ()=>{
        let blockchain;
        beforeEach(()=>{
            blockchain = new Blockchain();
        })

        describe('and there are no outputs for the wallet', ()=>{
            it('returns the `STARTING_BALACNE`', ()=>{
                expect(
                    Wallet.calculateBalance({
                        chain: blockchain.chain,
                        address: wallet.publicKey,
                    })
                ).toEqual(STARTING_BALANCE)
            })
        })

        describe('and there are outputs for the wallet', ()=>{
            let transactionOne, transactionTwo;

            beforeEach(()=>{
                transactionOne = new Wallet().createTransaction({
                    recipient: wallet.publicKey,
                    amount: 50,
                })

                transactionTwo = new Wallet().createTransaction({
                    recipient: wallet.publicKey,
                    amount: 60,
                })
                blockchain.addBlock({data: [transactionOne, transactionTwo]})
            })

            it('adds the sum of all outputs to the wallet balance', ()=>{
                expect(
                    Wallet.calculateBalance({
                        chain: blockchain.chain,
                        address: wallet.publicKey
                    })
                ).toEqual( STARTING_BALANCE + transactionOne.outputMap[wallet.publicKey] + transactionTwo.outputMap[wallet.publicKey] )
            })

            describe('and the wallet has made a transaction', ()=>{
                let recentTransaction;

                beforeEach(()=>{
                    recentTransaction = wallet.createTransaction({
                        recipient: 'foo-address',
                        amount: 30,
                    })
                })

                blockchain.addBlock({ data: [recentTransaction] })

                it('returns the output amount of the recent transaction', ()=>{
                    expect(
                        Wallet.calculateBalance({
                            chain: blockchain.chain,
                            address: wallet.publicKey
                        })
                    ).toEqual(recentTransaction.outputMap[wallet.publicKey])
                })

                describe('and there are outputs next to and after the recent transaction', ()=>{
                    let sameBlockTransaction, nextBlockTransaction;

                    beforeEach(()=>{
                        recentTransaction = wallet.createTransaction({
                            recipient: 'later-foo-address',
                            amount: 60,
                        })
                        sameBlockTransaction = Transaction.rewardTransaction({minerWallet: wallet})

                        blockchain.addBlock({ data: [recentTransaction, sameBlockTransaction]})
    
                        nextBlockTransaction = new Wallet().createTransaction({
                            recipient: wallet.publicKey,
                            amount: 75
                        })
    
                        blockchain.addBlock({ data: [nextBlockTransaction] })
                    })



                })

            })

        })
    })
})