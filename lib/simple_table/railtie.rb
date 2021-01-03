class SimpleTable::Railtie < Rails::Railtie
  initializer "simple_table.view_helpers" do
    ActionView::Base.send :include, SimpleTable::Helper
  end

  initializer "simple_table.configure_rails_initialization" do
    ActionController::Base.instance_eval do
      before_action do
        params.delete(:simple_table_cache_killa) if params
      end
    end
  end
end

class SimpleTable::Engine < Rails::Engine
end
