#![cfg_attr(not(feature = "std"), no_std, no_main)]
// 0xcb0861d67832230c992172f74b2e186b3c4c3c78b02ba00bc68acf1bacc3014e
#[ink::contract]
mod xcontract_demo {
    use contract_b::ContractBRef;
    use ink::storage::Mapping;
    use ink::{
        env::{
            call::{build_call, ExecutionInput, Selector},
            DefaultEnvironment,
        },
        H160, H256, U256,
    };

    #[ink(event)]
    pub struct Flipped {
        #[ink(topic)]
        value: bool,
    }

    #[ink(event)]
    pub struct OwnershipTransferred {
        #[ink(topic)]
        pub previous_owner: Option<AccountId>,
        #[ink(topic)]
        pub new_owner: AccountId,
    }

    /// Defines the storage of your contract.
    /// Add new fields to the below struct in order
    /// to add new static storage fields to your contract.
    #[ink(storage)]
    pub struct XcontractDemo {
        /// Stores a single `bool` value on the storage.
        contract_b: ContractBRef,
        contract_c: H160,
        users: Mapping<H160, H256>,
    }

    impl XcontractDemo {
        /// Initialize contract_b and also defines the state of contract_a.
        #[ink(constructor)]
        pub fn new(contract_hash: H256, contract_address: H160) -> Self {
            let contract_b = ContractBRef::new(false)
                .code_hash(contract_hash)
                .endowment(U256::zero())
                .salt_bytes(None)
                .instantiate();

            Self {
                contract_b,
                contract_c: contract_address,
                users: Mapping::new(),
            }
        }

        /// Constructor that initializes the `bool` value to `false`.
        ///
        /// Constructors can delegate to other constructors.
        #[ink(constructor)]
        pub fn default() -> Self {
            Self::new(Default::default(), Default::default())
        }

        /// A message that can be called on instantiated contracts.
        /// This one flips the value of the stored `bool` from `true`
        /// to `false` and vice versa.
        #[ink(message)]
        pub fn flip_and_get(&mut self) -> bool {
            self.contract_b.flip();
            self.contract_b.get()
        }

        #[ink(message)]
        pub fn increase_count(&mut self) {
            let _ = build_call::<DefaultEnvironment>()
                .call(self.contract_c)
                .transferred_value(U256::zero())
                .exec_input(ExecutionInput::new(Selector::new(ink::selector_bytes!(
                    "increment"
                ))))
                .returns::<()>()
                .invoke();
        }

        #[ink(message)]
        pub fn decrease_count(&mut self) {
            let _ = build_call::<DefaultEnvironment>()
                .call(self.contract_c)
                .transferred_value(U256::zero())
                .exec_input(ExecutionInput::new(Selector::new(ink::selector_bytes!(
                    "decrement"
                ))))
                .returns::<()>()
                .invoke();
        }
    }

    /// Unit tests in Rust are normally defined within such a `#[cfg(test)]`
    /// module and test functions are marked with a `#[test]` attribute.
    /// The below code is technically just normal Rust code.
    #[cfg(test)]
    mod tests {
        /// Imports all the definitions from the outer scope so we can use them here.
        use super::*;

        #[ink::test]
        fn call_contract_b_works() {
            let mut contract = XcontractDemo::new([0x0; 32].into(), [0x0; 20].into());

            // assert_eq!(
            //     contract.flip_and_get(),
            //     false,
            //     "Should flip the stored value"
            // );
        }
    }

    /// E2E testing in ink! can be done
    /// This is a more detailed approach to testing and can simulate on-chain situations
    #[cfg(all(test, feature = "e2e-tests"))]
    mod e2e_tests {
        use core::str::FromStr;

        use super::*;
        use contract_c::ContractCRef;
        use ink_e2e::ContractsBackend;

        type E2EResult<T> = std::result::Result<T, Box<dyn std::error::Error>>;

        #[ink_e2e::test]
        async fn instantiate_contracta<Client: E2EBackend>(
            mut client: Client,
        ) -> E2EResult<()> {
            // given
            let contract_b = client
                .upload("contract-b", &ink_e2e::alice())
                .submit()
                .await
                .expect("other_contract upload failed");
            let mut c_constructor = ContractCRef::new(5);
            
            let contract_c = client
                .instantiate("contract-c", &ink_e2e::bob(), &mut c_constructor)
                .submit()
                .await
                .expect("Instantiate contract_c failed");


            let mut constructor = XcontractDemoRef::new(
                contract_b.code_hash,
                H160::from(H256::from_slice(contract_c.account_id.as_ref())),
            );
            let call_result = client
                .instantiate("xcontract-demo", &ink_e2e::alice(), &mut constructor)
                .dry_run()
                .await?;

            assert!(!call_result.is_err());

            let contract = client
                .instantiate("xcontract-demo", &ink_e2e::alice(), &mut constructor)
                .submit()
                .await
                .expect("Instantiate contract_a failed");

            let mut builder = contract.call_builder::<XcontractDemo>();
            let call = builder.flip_and_get();

            let result = client.call(&ink_e2e::alice(), &call)
                .submit()
                .await
                .expect("Call contract_c failed")
                .return_value();

            assert_eq!(result, true, "Should return false");

            Ok(())
        }
    }
}
