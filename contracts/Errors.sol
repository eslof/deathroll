// SPDX-License-Identifier: CC BY
pragma solidity ^0.8.7;

// todo: on mainnet change these to "1" "2" et.c. to save gas
contract Errors {
    string internal constant ERROR_TAX_LIMIT = "Tax over limit";
    string internal constant ERROR_BOUNDS = "Out of bounds";
    string internal constant ERROR_SANITY = "Sanity check";
    string internal constant ERROR_BALANCE = "Out of funds";
    string internal constant ERROR_WITHDRAW = "Withdraw failed";
    string internal constant ERROR_CONFIRM_NOT_EXPIRED = "Confirm not expired";
    string internal constant ERROR_BET_CONFIRMED = "Bet already confirmed";
    string internal constant ERROR_BET_NOT_CONFIRMED = "Bet not confirmed";
    string internal constant ERROR_BET_EXPIRED = "Bet expired";
    string internal constant ERROR_BET_NOT_EXPIRED = "Bet not expired";
    string internal constant ERROR_BET_MISSING = "Bet not found";
    string internal constant ERROR_BET_ONGOING = "Bet ongoing";
    string internal constant ERROR_BET_PENDING = "Bet awaiting participant";
    string internal constant ERROR_BET_TAKEN = "Bet taken";
    string internal constant ERROR_BET_PASSWORD = "Bet password mismatch";
}