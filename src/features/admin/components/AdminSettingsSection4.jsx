import Icon from '../../../components/ui/Icon'
import AdminAcademicYears from './AdminAcademicYears'

export default function AdminSettingsSection4({ setSettings, setToast, settings = {}, setDark, dark }) {
  const safeSettings = settings && typeof settings === 'object' ? settings : {};

  return (
    <div className="ad-settings"><form onSubmit={e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.currentTarget));
      if (typeof setSettings === 'function') {
        setSettings({ ...data, notifications: data.notifications === 'on', weekly: data.weekly === 'on' });
      }
      if (typeof setToast === 'function') {
        setToast('Settings saved on this device');
      }
    }}>
      <section className="ad-panel">
        <div className="ad-panel-head">
          <h2><span className="ad-icon blue"><Icon name="School" /></span>School Information</h2>
        </div>
        <p className="ad-settings-description">The details that make your school yours.</p>
        <div className="ad-form-grid">
          <label>School name<input name="school" defaultValue={safeSettings.school || 'ABC Daycare & Kindergarten'} required /></label>
          <label>Contact email<input name="email" type="email" defaultValue={safeSettings.email || ''} required /></label>
          <label>Phone number<input name="phone" type="tel" defaultValue={safeSettings.phone || ''} /></label>
          <label>Administrator name<input name="name" defaultValue={safeSettings.name || ''} required /></label>
        </div>
      </section>
      <section className="ad-panel">
        <div className="ad-panel-head">
          <h2><span className="ad-icon purple"><Icon name="Bell" /></span>Notification Preferences</h2>
        </div>
        <label className="ad-preference">
          <span><strong>School notifications</strong><small>Save your preference for school activity updates.</small></span>
          <input type="checkbox" name="notifications" defaultChecked={Boolean(safeSettings.notifications)} />
        </label>
        <label className="ad-preference">
          <span><strong>Weekly summary</strong><small>Save your preference for a weekly overview.</small></span>
          <input type="checkbox" name="weekly" defaultChecked={Boolean(safeSettings.weekly)} />
        </label>
        <p className="ad-local-note"><Icon name="Info" size={16} />Preferences are saved into your school workspace database.</p>
      </section>
      <section className="ad-panel ad-appearance">
        <div>
          <h2>Appearance</h2>
          <p>Choose a comfortable look for your workspace.</p>
        </div>
        <button type="button" className="ad-button secondary" onClick={() => setDark && setDark(!dark)}>
          <Icon name={dark ? 'Sun' : 'Moon'} size={17} />{dark ? 'Light' : 'Dark'} mode
        </button>
      </section>
      <div className="ad-settings-save">
        <small>Changes are saved to your school database.</small>
        <button className="ad-button" type="submit"><Icon name="Check" size={17} />Save Changes</button>
      </div>
    </form><AdminAcademicYears setToast={setToast}/></div>
  );
}
