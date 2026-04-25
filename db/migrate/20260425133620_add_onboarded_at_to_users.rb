class AddOnboardedAtToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :onboarded_at, :datetime
  end
end
