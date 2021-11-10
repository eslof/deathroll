module.exports = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "betId",
                type: "uint256"
            }
        ],
        name: "BetCancel",
        type: "event"
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "betId",
                type: "uint256"
            },
            {
                indexed: false,
                internalType: "address",
                name: "winner",
                type: "address"
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "value",
                type: "uint256"
            }
        ],
        name: "BetComplete",
        type: "event"
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "betId",
                type: "uint256"
            },
            {
                indexed: false,
                internalType: "bool",
                name: "isAddr1Begin",
                type: "bool"
            }
        ],
        name: "BetConfirm",
        type: "event"
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "betId",
                type: "uint256"
            }
        ],
        name: "BetJoin",
        type: "event"
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "uint256",
                name: "betId",
                type: "uint256"
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "value",
                type: "uint256"
            }
        ],
        name: "BetOpen",
        type: "event"
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "previousOwner",
                type: "address"
            },
            {
                indexed: true,
                internalType: "address",
                name: "newOwner",
                type: "address"
            }
        ],
        name: "OwnershipTransferred",
        type: "event"
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "uint256",
                name: "betId",
                type: "uint256"
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "result",
                type: "uint256"
            }
        ],
        name: "RollComplete",
        type: "event"
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "uint256",
                name: "denominator",
                type: "uint256"
            }
        ],
        name: "taxSet",
        type: "event"
    },
    {
        inputs: [],
        name: "TAX_LIMIT",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "betId",
                type: "uint256"
            }
        ],
        name: "cancelBet",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [],
        name: "cancelBet",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "betId",
                type: "uint256"
            },
            {
                internalType: "bool",
                name: "isAddr1Winner",
                type: "bool"
            }
        ],
        name: "completeBet",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "betId",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "result",
                type: "uint256"
            }
        ],
        name: "completeRoll",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "betId",
                type: "uint256"
            }
        ],
        name: "confirmBet",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes20",
                name: "auth",
                type: "bytes20"
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256"
            },
            {
                internalType: "bytes32",
                name: "pwdHash",
                type: "bytes32"
            }
        ],
        name: "createBet",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "betId",
                type: "uint256"
            }
        ],
        name: "getBet",
        outputs: [
            {
                components: [
                    {
                        internalType: "bool",
                        name: "isConfirmed",
                        type: "bool"
                    },
                    {
                        internalType: "address",
                        name: "addr1",
                        type: "address"
                    },
                    {
                        internalType: "address",
                        name: "addr2",
                        type: "address"
                    },
                    {
                        internalType: "uint256",
                        name: "balance",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "timestamp",
                        type: "uint256"
                    },
                    {
                        internalType: "bytes32",
                        name: "password",
                        type: "bytes32"
                    }
                ],
                internalType: "struct Bet",
                name: "",
                type: "tuple"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "getBet",
        outputs: [
            {
                components: [
                    {
                        internalType: "bool",
                        name: "isConfirmed",
                        type: "bool"
                    },
                    {
                        internalType: "address",
                        name: "addr1",
                        type: "address"
                    },
                    {
                        internalType: "address",
                        name: "addr2",
                        type: "address"
                    },
                    {
                        internalType: "uint256",
                        name: "balance",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "timestamp",
                        type: "uint256"
                    },
                    {
                        internalType: "bytes32",
                        name: "password",
                        type: "bytes32"
                    }
                ],
                internalType: "struct Bet",
                name: "",
                type: "tuple"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "getConfig",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "getContractBalance",
        outputs: [
            {
                internalType: "int256",
                name: "",
                type: "int256"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "getTax",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "addr",
                type: "address"
            }
        ],
        name: "getUser",
        outputs: [
            {
                components: [
                    {
                        internalType: "uint256",
                        name: "balance",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "betId",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "fromBlock",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "toBlock",
                        type: "uint256"
                    }
                ],
                internalType: "struct User",
                name: "",
                type: "tuple"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "getUser",
        outputs: [
            {
                components: [
                    {
                        internalType: "uint256",
                        name: "balance",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "betId",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "fromBlock",
                        type: "uint256"
                    },
                    {
                        internalType: "uint256",
                        name: "toBlock",
                        type: "uint256"
                    }
                ],
                internalType: "struct User",
                name: "",
                type: "tuple"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes20",
                name: "auth",
                type: "bytes20"
            },
            {
                internalType: "uint256",
                name: "betId",
                type: "uint256"
            },
            {
                internalType: "bytes32",
                name: "password",
                type: "bytes32"
            }
        ],
        name: "joinBet",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [],
        name: "owner",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "renounceOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [],
        name: "resolveBet",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "min",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "max",
                type: "uint256"
            }
        ],
        name: "setBetLimits",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "denominator",
                type: "uint256"
            }
        ],
        name: "setTax",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "confirm",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "expire",
                type: "uint256"
            }
        ],
        name: "setTimeLimits",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "newOwner",
                type: "address"
            }
        ],
        name: "transferOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256"
            }
        ],
        name: "withdraw",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [],
        name: "withdraw",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        stateMutability: "payable",
        type: "receive"
    }
]