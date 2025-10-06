#![cfg_attr(not(feature = "std"), no_std, no_main)]

mod traits;

#[ink::contract]
mod psp_coin {
    use ink::{H160, U256, env::call, storage::Mapping};
    use ink::prelude::{string::String, vec::Vec};

    use crate::traits::{PSP22, PSP22Burnable, PSP22Error, PSP22Metadata, PSP22Mintable};

    /// Defines the storage of your contract.
    /// Add new fields to the below struct in order
    /// to add new static storage fields to your contract.
    #[ink(storage)]
    #[derive(Default)]
    pub struct PspCoin {
        total_supply: U256,
        balances: Mapping<H160, U256>,
        // can owner authorize (allowance > balance)?
        allowances: Mapping<(H160, H160), U256>, // (owner, spender) -> allowance
        metadata: (String, String, u8),
    }

    impl PspCoin {
        /// Constructor that initializes the `bool` value to the given `init_value`.
        #[ink(constructor)]
        pub fn new() -> Self {
            Default::default()
        }

        #[ink(constructor)]
        pub fn new_with_supply(total_supply: U256) -> Self {
            let mut instance = Self::new();
            let _ = instance.mint(total_supply);
            instance
        }
    }

    impl PSP22 for PspCoin {
        #[ink(message)]
        fn total_supply(&self) -> U256 {
            self.total_supply
        }

        #[ink(message)]
        fn balance_of(&self, owner: H160) -> U256 {
            self.balances.get(owner).unwrap_or_default()
        }

        #[ink(message)]
        fn allowance(&self, owner: H160, spender: H160) -> U256 {
            self.allowances.get((owner, spender)).unwrap_or_default()
        }

        #[ink(message)]
        fn transfer(&mut self, to: H160, value: U256, _data: Vec<u8>) -> Result<(), PSP22Error> {
            let owner = self.env().caller();
            if owner == to || value.is_zero() {
                return Ok(());
            }

            // Get owner and to balances
            let owner_balance = self.balance_of(owner);
            if owner_balance < value {
                return Err(PSP22Error::InsufficientBalance);
            }

            let to_balance = self.balance_of(to);

            // Add value to to's balance while deducting value from owner's balance
            self.balances.insert(to, &to_balance.saturating_add(value));
            self.balances
                .insert(owner, &owner_balance.saturating_sub(value));
            Ok(())
        }

        #[ink(message)]
        fn transfer_from(
            &mut self,
            from: H160,
            to: H160,
            value: U256,
            data: Vec<u8>,
        ) -> Result<(), PSP22Error> {
            let caller = self.env().caller();
            if from == to || value.is_zero() {
                return Ok(());
            }

            if caller == from {
                return self.transfer(to, value, data);
            }

            // Ensure there is enough allowance
            let allowance = self.allowance(from, caller);
            if allowance < value {
                return Err(PSP22Error::InsufficientAllowance);
            }

            let from_balance = self.balance_of(from);
            if from_balance < value {
                return Err(PSP22Error::InsufficientBalance);
            }

            // Remove the allowance from `from`
            self.allowances
                .insert((from, caller), &allowance.saturating_sub(value));

            // remove the balance from `from` and add to `to`
            // Always writing to storage manages fees, but more storage.
            self.balances
                .insert(from, &from_balance.saturating_sub(value));
            let to_balance = self.balance_of(to);
            self.balances.insert(to, &to_balance.saturating_add(value));
            Ok(())
        }

        #[ink(message)]
        fn approve(&mut self, spender: H160, value: U256) -> Result<(), PSP22Error> {
            let caller = self.env().caller();
            if caller == spender {
                return Ok(());
            }

            if value.is_zero() {
                self.allowances.remove((caller, spender));
            } else {
                self.allowances.insert((caller, spender), &value);
            }

            Ok(())
        }

        #[ink(message)]
        fn increase_allowance(
            &mut self,
            spender: H160,
            delta_value: U256,
        ) -> Result<(), PSP22Error> {
            let owner = self.env().caller();
            if owner == spender {
                return Ok(());
            }

            let allowance = self.allowance(owner, spender);
            self.allowances
                .insert((owner, spender), &allowance.saturating_add(delta_value));

            Ok(())
        }

        #[ink(message)]
        fn decrease_allowance(
            &mut self,
            spender: H160,
            delta_value: U256,
        ) -> Result<(), PSP22Error> {
            let owner = self.env().caller();
            if owner == spender {
                return Ok(());
            }

            let allowance = self.allowance(owner, spender);
            if allowance < delta_value {
                self.allowances.remove((owner, spender));
                return Ok(());
            }

            self.allowances
                .insert((owner, spender), &allowance.saturating_sub(delta_value));
            Ok(())
        }
    }

    impl PSP22Metadata for PspCoin {
        #[ink(message)]
        fn name(&self) -> Option<String> {
            Some(self.metadata.0.clone())
        }

        #[ink(message)]
        fn symbol(&self) -> Option<String> {
            Some(self.metadata.1.clone())
        }

        #[ink(message)]
        fn decimals(&self) -> u8 {
            self.metadata.2
        }
    }

    impl PSP22Mintable for PspCoin {
        #[ink(message)]
        fn mint(&mut self, value: U256) -> Result<(), PSP22Error> {
            let to = self.env().caller();
            if value.is_zero() {
                return Ok(());
            }

            // Increase total supply so to will not overflow
            let new_supply = self
                .total_supply
                .checked_add(value)
                .ok_or(PSP22Error::Custom(String::from(
                    "Max PSP22 supply exceeded. Max supply limited to 2^128-1.",
                )))?;
            self.total_supply = new_supply;

            let new_to_balance = self.balance_of(to).saturating_add(value);
            self.balances.insert(to, &new_to_balance);
            Ok(())
        }
    }

    impl PSP22Burnable for PspCoin {
        #[ink(message)]
        fn burn(&mut self, value: U256) -> Result<(), PSP22Error> {
            let from = self.env().caller();
            if value.is_zero() {
                return Ok(());
            }

            let balance = self.balance_of(from);
            if balance < value {
                return Err(PSP22Error::InsufficientBalance);
            }

            self.balances.insert(from, &balance.saturating_sub(value));

            self.total_supply = self.total_supply.saturating_sub(value);
            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use ink::env::test::{default_accounts, set_caller};

        use super::*;

        #[ink::test]
        fn contract_instantiation_should_work() {
            let alice = default_accounts().alice;
            set_caller(alice);
            let supply: U256 = U256::from(1_000u64);
            let contract = PspCoin::new_with_supply(supply);

            assert_eq!(contract.total_supply(), supply, "Supply must match instantiation supply");
            assert_eq!(contract.balance_of(alice), contract.total_supply(), "Alice must have all the total supply");
        }

        #[ink::test]
        fn calling_transfer_from_should_work() {
            let alice = default_accounts().alice;
            let bob = default_accounts().bob;
            let eve = default_accounts().eve;

            let supply = U256::from(1_000u64);
            set_caller(alice);
            let mut pspcoin = PspCoin::new_with_supply(supply);

            set_caller(bob);
            let result = pspcoin.transfer_from(alice, eve, U256::from(10), [].to_vec());
            assert!(result.is_err(), "Should not transfer without allowance");

            // let alice grant allowance to bob
            set_caller(alice);
            let result = pspcoin.approve(bob, U256::from(30));
            assert!(result.is_ok(), "Approve should work");

            // bob can now transfer on behalf of alice
            set_caller(bob);
            let result = pspcoin.transfer_from(alice, eve, U256::from(10), [].to_vec());
            assert!(result.is_ok(), "TransferFrom should work");
            assert_eq!(pspcoin.balance_of(eve), U256::from(10), "Eve should have 10 tokens");
            assert_eq!(pspcoin.balance_of(alice), U256::from(990), "Alice should have 990 tokens");
            assert_eq!(pspcoin.allowance(alice, bob), U256::from(20), "Bob should have allowance of 20 tokens");
        }
    }
}
