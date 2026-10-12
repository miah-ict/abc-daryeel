import Icon from '../../../components/ui/Icon'
import { Empty } from '../../../components/ui/TeacherUI';


export default function StudentsGallerySection5({gallery, filter, setFilter, filteredGallery, setModal, favorites, toggleFavorite}) {
 return (<>
          <div className="st-filterbar"><div role="tablist" aria-label="Gallery category">{['All','Classroom','Outdoor','Events','Favorites'].map(x=><button role="tab" aria-selected={filter===x} key={x} onClick={()=>setFilter(x)}>{x}</button>)}</div><span className="st-photo-count">{filteredGallery.length} happy memories</span></div><div className="st-gallery-grid">{filteredGallery.map(photo=><article className="st-gallery-card" key={photo.id}><button className="st-gallery-open" onClick={()=>setModal({type:'photo',index:gallery.findIndex(item=>item.id===photo.id)})} aria-label={`Open ${photo.title}`}><img src={photo.src} alt={photo.title} loading="lazy"/><span><small>{photo.category}</small><strong>{photo.title}</strong></span></button><button className={`st-favorite ${favorites.includes(photo.id)?'selected':''}`} aria-label={`${favorites.includes(photo.id)?'Remove':'Add'} ${photo.title} ${favorites.includes(photo.id)?'from':'to'} favorites`} aria-pressed={favorites.includes(photo.id)} onClick={()=>toggleFavorite(photo.id)}><Icon name="Heart" size={19}/></button></article>)}</div>{!filteredGallery.length&&<Empty title="No memories here yet">Choose another category or check again after your school publishes photos.</Empty>}
        </>)
}
