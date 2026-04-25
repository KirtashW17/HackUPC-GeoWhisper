# Abstract base class for every Active Record model in the app.
#
# Marked as the primary abstract class so STI columns and connection
# resolution use it as the root rather than +ActiveRecord::Base+.
class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class
end
