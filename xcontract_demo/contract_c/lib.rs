#![cfg_attr(not(feature = "std"), no_std, no_main)]

pub use self::contract_c::ContractCRef;

#[ink::contract]
mod contract_c {

    /// Defines the storage of your contract.
    /// Add new fields to the below struct in order
    /// to add new static storage fields to your contract.
    #[ink(storage)]
    pub struct ContractC {
        /// Stores a single `bool` value on the storage.
        count: u64
    }

    impl ContractC {
        /// Constructor that initializes the `bool` value to the given `init_value`.
        #[ink(constructor)]
        pub fn new(init_value: u64) -> Self {
            Self { count: init_value }
        }

        /// A message that can be called on instantiated contracts.
        /// This one flips the value of the stored `bool` from `true`
        /// to `false` and vice versa.
        #[ink(message)]
        pub fn increment(&mut self) {
            self.count = self.count.saturating_add(1);
        }

        /// A message that can be called on instantiated contracts.
        /// This one flips the value of the stored `bool` from `true`
        /// to `false` and vice versa.
        #[ink(message)]
        pub fn decrement(&mut self) {
            self.count = self.count.saturating_sub(1);
        }

        /// Simply returns the current value of our `bool`.
        #[ink(message)]
        pub fn get(&self) -> u64 {
            self.count
        }
    }

    /// Unit tests in Rust are normally defined within such a `#[cfg(test)]`
    /// module and test functions are marked with a `#[test]` attribute.
    /// The below code is technically just normal Rust code.
    #[cfg(test)]
    mod tests {
        
    }
}
